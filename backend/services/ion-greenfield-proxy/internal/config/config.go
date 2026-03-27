package config

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	GreenfieldRPCEndpoint    string
	GreenfieldSPEndpoint     string
	GreenfieldPrivateKey     string
	GreenfieldChainID        int
	GreenfieldFeeGrantAmount string
	Port                     int
	MetricsPort              int
	ADNLPrivateKey           string
	ADNLConfigURL            string
	ADNLExternalAddr         string
	DNSPrivateKey            string
	DNSName                  string
	LogLevel                 string
	Env                      string
}

const (
	DefaultADNLConfigURL = "https://cdn.ice.io/testnet/global.config.json"
)

func Load(adnlKey, dnsKey, dnsName string) (*Config, error) {
	if _, err := os.Stat(".env"); err == nil {
		_ = godotenv.Load()
		slog.Info("loaded .env file")
	}

	env := envOrDefault("ENV", "production")

	cfg := &Config{Env: env}
	var errs []string

	cfg.GreenfieldRPCEndpoint, errs = requireURL(errs, "GREENFIELD_RPC_ENDPOINT")
	cfg.GreenfieldSPEndpoint, errs = requireURL(errs, "GREENFIELD_SP_ENDPOINT")
	cfg.GreenfieldPrivateKey, errs = requireHex(errs, "GREENFIELD_PRIVATE_KEY", true)
	cfg.GreenfieldChainID, errs = requireInt(errs, "GREENFIELD_CHAIN_ID")
	cfg.GreenfieldFeeGrantAmount = envOrDefault("GREENFIELD_FEE_GRANT_AMOUNT_BNB", "0.001")
	cfg.Port, errs = optionalPort(errs, "PORT", 3000)
	cfg.LogLevel = resolveLogLevel(envOrDefault("LOG_LEVEL", "info"))

	cfg.MetricsPort, errs = parseMetricsPort(errs, env)

	cfg.ADNLPrivateKey = cliOrEnv(adnlKey, "ADNL_PRIVATE_KEY")
	if cfg.ADNLPrivateKey == "" {
		if env == "development" {
			seed := make([]byte, ed25519.SeedSize)
			if _, err := rand.Read(seed); err != nil {
				return nil, fmt.Errorf("failed to generate random ADNL key: %w", err)
			}
			cfg.ADNLPrivateKey = hex.EncodeToString(seed)
			slog.Info("ADNL_PRIVATE_KEY not set — generated ephemeral key for development",
				"private_key", cfg.ADNLPrivateKey)
		} else {
			errs = append(errs, "ADNL_PRIVATE_KEY (or --adnl-key) is required")
		}
	}

	cfg.ADNLConfigURL = envOrDefault("ADNL_CONFIG_URL", DefaultADNLConfigURL)
	cfg.ADNLExternalAddr = os.Getenv("ADNL_EXTERNAL_ADDR")
	cfg.DNSPrivateKey = cliOrEnv(dnsKey, "DNS_PRIVATE_KEY")
	cfg.DNSName = cliOrEnv(dnsName, "DNS_NAME")

	if len(errs) > 0 {
		return nil, fmt.Errorf("config validation failed:\n  %s", strings.Join(errs, "\n  "))
	}
	return cfg, nil
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func (c *Config) LogFields() []any {
	return []any{
		"env", c.Env,
		"port", c.Port,
		"metrics_port", c.MetricsPort,
		"greenfield_rpc", c.GreenfieldRPCEndpoint,
		"greenfield_sp", c.GreenfieldSPEndpoint,
		"greenfield_chain_id", c.GreenfieldChainID,
		"fee_grant_amount", c.GreenfieldFeeGrantAmount,
		"log_level", c.LogLevel,
		"dns_name", c.DNSName,
		"adnl_key_set", c.ADNLPrivateKey != "",
		"adnl_config_url", c.ADNLConfigURL,
		"dns_key_set", c.DNSPrivateKey != "",
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func cliOrEnv(cliVal, envKey string) string {
	if cliVal != "" {
		return cliVal
	}
	return os.Getenv(envKey)
}

func requireURL(errs []string, key string) (string, []string) {
	val := os.Getenv(key)
	if val == "" {
		return "", append(errs, key+" is required")
	}
	u, err := url.Parse(val)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", append(errs, key+" must be a valid URL")
	}
	return val, errs
}

func requireHex(errs []string, key string, prefixed bool) (string, []string) {
	val := os.Getenv(key)
	if val == "" {
		return "", append(errs, key+" is required")
	}
	if prefixed && !strings.HasPrefix(val, "0x") {
		return "", append(errs, key+" must be 0x-prefixed hex")
	}

	if _, err := hex.DecodeString(strings.TrimPrefix(val, "0x")); err != nil {
		return "", append(errs, key+" must be valid hex")
	}

	return val, errs
}

func requireInt(errs []string, key string) (int, []string) {
	val := os.Getenv(key)
	if val == "" {
		return 0, append(errs, key+" is required")
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return 0, append(errs, key+" must be an integer")
	}
	return n, errs
}

func optionalPort(errs []string, key string, fallback int) (int, []string) {
	val := os.Getenv(key)
	if val == "" {
		return fallback, errs
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return 0, append(errs, key+" must be an integer")
	} else if n < 1 || n > 65535 {
		return 0, append(errs, key+" must be a valid port number (1-65535)")
	}

	return n, errs
}

func parseMetricsPort(errs []string, env string) (int, []string) {
	val := os.Getenv("METRICS_PORT")
	if val == "" {
		if env != "development" {
			return 0, append(errs, "METRICS_PORT is required in "+env+" mode")
		}
		slog.Warn("METRICS_PORT not set — metrics will be served on the main port")
		return 0, errs
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return 0, append(errs, "METRICS_PORT must be an integer")
	}
	return n, errs
}

func resolveLogLevel(s string) string {
	switch strings.ToLower(s) {
	case "debug", "info", "warn", "error":
		return strings.ToLower(s)
	default:
		slog.Warn("unknown LOG_LEVEL, defaulting to info", "value", s)
		return "info"
	}
}
