package config

import (
	"encoding/hex"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AdnlPrivateKey        string
	AdnlPort              int
	AdnlExternalAddr      string
	GlobalConfigURL       string
	GreenfieldRpcURLs     []string
	GreenfieldChainID     string
	GreenfieldPrivKey     string
	OnlineIOEnv           string
	CacheTTL              time.Duration
	CacheDir              string
	DataDir               string
	ShardIndex            int
	ShardCount            int
	ClusterOverlayID      string
	HeartbeatInterval     time.Duration
	ReclamationInterval   time.Duration
	StaleHeartbeatTimeout time.Duration
	ReclamationStartDelay time.Duration
	ActiveDHTLimit        int
	HttpPort              string
	MetricsPort           string
	LogLevel              string
}

// ClusterEnabled returns true if a cluster overlay ID is configured.
func (c Config) ClusterEnabled() bool {
	return c.ClusterOverlayID != ""
}

func Load() (Config, error) {
	adnlKey, err := secretFromEnvOrFile("ADNL_PRIVATE_KEY")
	if err != nil {
		return Config{}, err
	}
	if err := validateAdnlKey(adnlKey); err != nil {
		return Config{}, err
	}

	globalConfigURL := os.Getenv("GLOBAL_CONFIG_URL")
	if globalConfigURL == "" {
		return Config{}, fmt.Errorf("GLOBAL_CONFIG_URL is required")
	}
	if err := validateURL(globalConfigURL); err != nil {
		return Config{}, fmt.Errorf("GLOBAL_CONFIG_URL: %w", err)
	}

	rpcURLs, err := parseRpcURLs(os.Getenv("GREENFIELD_RPC_URLS"))
	if err != nil {
		return Config{}, err
	}

	onlineIOEnv := os.Getenv("ONLINEIO_ENV")
	if onlineIOEnv == "" {
		return Config{}, fmt.Errorf("ONLINEIO_ENV is required")
	}

	greenfieldPrivKey, err := secretFromEnvOrFile("GREENFIELD_PRIVATE_KEY")
	if err != nil {
		return Config{}, err
	}
	if greenfieldPrivKey == "" {
		return Config{}, fmt.Errorf("GREENFIELD_PRIVATE_KEY is required (set env var or GREENFIELD_PRIVATE_KEY_FILE)")
	}
	if err := validateHexKey(greenfieldPrivKey, "GREENFIELD_PRIVATE_KEY"); err != nil {
		return Config{}, err
	}

	adnlPort, err := parseRequiredPort("PORT")
	if err != nil {
		return Config{}, err
	}

	adnlExternalAddr := os.Getenv("ADNL_EXTERNAL_ADDR")
	if adnlExternalAddr == "" {
		return Config{}, fmt.Errorf("ADNL_EXTERNAL_ADDR is required (e.g. 1.2.3.4:3278)")
	}
	if err := validateExternalAddr(adnlExternalAddr); err != nil {
		return Config{}, err
	}

	cacheTTL, err := parseDuration("CACHE_TTL", 24*time.Hour)
	if err != nil {
		return Config{}, err
	}
	shardIndex, err := parseInt("SHARD_INDEX", 0)
	if err != nil {
		return Config{}, err
	}
	shardCount, err := parseInt("SHARD_COUNT", 1)
	if err != nil {
		return Config{}, err
	}
	activeDHTLimit, err := parseInt("ACTIVE_DHT_LIMIT", 100000)
	if err != nil {
		return Config{}, err
	}

	if shardCount <= 0 {
		return Config{}, fmt.Errorf("SHARD_COUNT must be positive, got %d", shardCount)
	}
	if shardIndex < 0 || shardIndex >= shardCount {
		return Config{}, fmt.Errorf("SHARD_INDEX must be in [0, SHARD_COUNT), got %d/%d", shardIndex, shardCount)
	}
	if activeDHTLimit <= 0 || activeDHTLimit > 10_000_000 {
		return Config{}, fmt.Errorf("ACTIVE_DHT_LIMIT must be in (0, 10000000], got %d", activeDHTLimit)
	}
	if cacheTTL <= 0 {
		return Config{}, fmt.Errorf("CACHE_TTL must be positive, got %v", cacheTTL)
	}

	heartbeatInterval, err := parseDuration("HEARTBEAT_INTERVAL", 60*time.Second)
	if err != nil {
		return Config{}, err
	}
	reclamationInterval, err := parseDuration("RECLAMATION_INTERVAL", 5*time.Minute)
	if err != nil {
		return Config{}, err
	}
	staleHeartbeatTimeout, err := parseDuration("STALE_HEARTBEAT_TIMEOUT", 10*time.Minute)
	if err != nil {
		return Config{}, err
	}
	reclamationStartDelay, err := parseDuration("RECLAMATION_START_DELAY", 0)
	if err != nil {
		return Config{}, err
	}
	if heartbeatInterval <= 0 {
		return Config{}, fmt.Errorf("HEARTBEAT_INTERVAL must be positive, got %v", heartbeatInterval)
	}
	if reclamationInterval <= 0 {
		return Config{}, fmt.Errorf("RECLAMATION_INTERVAL must be positive, got %v", reclamationInterval)
	}
	if staleHeartbeatTimeout <= 0 {
		return Config{}, fmt.Errorf("STALE_HEARTBEAT_TIMEOUT must be positive, got %v", staleHeartbeatTimeout)
	}
	if reclamationStartDelay < 0 {
		return Config{}, fmt.Errorf("RECLAMATION_START_DELAY must be non-negative, got %v", reclamationStartDelay)
	}

	return Config{
		AdnlPrivateKey:        adnlKey,
		AdnlPort:              adnlPort,
		AdnlExternalAddr:      adnlExternalAddr,
		GlobalConfigURL:       globalConfigURL,
		GreenfieldRpcURLs:     rpcURLs,
		GreenfieldChainID:     envOrDefault("GREENFIELD_CHAIN_ID", "greenfield_1017-1"),
		GreenfieldPrivKey:     greenfieldPrivKey,
		OnlineIOEnv:           onlineIOEnv,
		CacheTTL:              cacheTTL,
		CacheDir:              envOrDefault("CACHE_DIR", "/data/cache"),
		DataDir:               envOrDefault("DATA_DIR", "/data/db"),
		ShardIndex:            shardIndex,
		ShardCount:            shardCount,
		ClusterOverlayID:      os.Getenv("CLUSTER_OVERLAY_ID"),
		HeartbeatInterval:     heartbeatInterval,
		ReclamationInterval:   reclamationInterval,
		StaleHeartbeatTimeout: staleHeartbeatTimeout,
		ReclamationStartDelay: reclamationStartDelay,
		ActiveDHTLimit:        activeDHTLimit,
		HttpPort:              envOrDefault("HTTP_PORT", "8080"),
		MetricsPort:           os.Getenv("METRICS_PORT"),
		LogLevel:              envOrDefault("LOG_LEVEL", "info"),
	}, nil
}

func validateAdnlKey(key string) error {
	if key == "" {
		return fmt.Errorf("ADNL_PRIVATE_KEY is required")
	}
	return validateHexKey(key, "ADNL_PRIVATE_KEY")
}

func validateHexKey(key, name string) error {
	if len(key) != 64 {
		return fmt.Errorf("%s must be 64 hex characters (32 bytes), got %d", name, len(key))
	}
	if _, err := hex.DecodeString(key); err != nil {
		return fmt.Errorf("%s is not valid hex: %w", name, err)
	}
	return nil
}

func parseRpcURLs(raw string) ([]string, error) {
	if raw == "" {
		return nil, fmt.Errorf("GREENFIELD_RPC_URLS is required")
	}
	var urls []string
	for _, u := range strings.Split(raw, ",") {
		u = strings.TrimSpace(u)
		if u != "" {
			if err := validateURL(u); err != nil {
				return nil, fmt.Errorf("GREENFIELD_RPC_URLS: %q: %w", u, err)
			}
			urls = append(urls, u)
		}
	}
	if len(urls) == 0 {
		return nil, fmt.Errorf("GREENFIELD_RPC_URLS contains no valid URLs")
	}
	return urls, nil
}

// validateURL accepts http(s) URLs (with SSRF checks) and file:// URLs
// restricted to the current working directory.
func validateURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	switch u.Scheme {
	case "file":
		return validateFileURL(u.Path)
	case "http", "https":
		return validateNetworkURL(u)
	default:
		return fmt.Errorf("URL scheme must be http, https, or file, got %q", u.Scheme)
	}
}

func validateFileURL(path string) error {
	if path == "" {
		return fmt.Errorf("file:// URL has empty path")
	}
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("cannot determine working directory: %w", err)
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("cannot resolve file path: %w", err)
	}
	if abs == cwd {
		return fmt.Errorf("file:// path must point to a file, not the directory itself")
	}
	if !strings.HasPrefix(abs, cwd+string(filepath.Separator)) {
		return fmt.Errorf("file:// path %q is outside working directory %q", abs, cwd)
	}
	return nil
}

func validateNetworkURL(u *url.URL) error {
	host := u.Hostname()
	ip := net.ParseIP(host)
	if ip != nil {
		return validateIP(host, ip)
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("cannot resolve hostname %q: %w", host, err)
	}
	for _, resolved := range ips {
		if err := validateIP(host, resolved); err != nil {
			return err
		}
	}
	return nil
}

func validateIP(host string, ip net.IP) error {
	if ip.IsUnspecified() || ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsMulticast() {
		return fmt.Errorf("URL host %q resolves to a private/restricted IP %s", host, ip)
	}
	return nil
}

func parseRequiredPort(key string) (int, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return 0, fmt.Errorf("%s is required", key)
	}
	port, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s must be a number: %w", key, err)
	}
	if port <= 0 || port > 65535 {
		return 0, fmt.Errorf("%s must be between 1 and 65535, got %d", key, port)
	}
	return port, nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseInt(key string, fallback int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s: invalid integer %q: %w", key, v, err)
	}
	return n, nil
}

func parseDuration(key string, fallback time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: invalid duration %q: %w", key, v, err)
	}
	return d, nil
}

func validateExternalAddr(addr string) error {
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil || host == "" {
		return fmt.Errorf("ADNL_EXTERNAL_ADDR must be in host:port format, got %q", addr)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil || port <= 0 || port > 65535 {
		return fmt.Errorf("ADNL_EXTERNAL_ADDR port must be between 1 and 65535, got %q", portStr)
	}
	return nil
}

// secretFromEnvOrFile reads a secret from environment variable KEY, or from
// the file path in KEY_FILE. File takes precedence when both are set.
// This supports Docker secrets (mounted as files) without breaking env-var usage.
// Warns if the file has group/other permission bits set.
func secretFromEnvOrFile(key string) (string, error) {
	filePath := os.Getenv(key + "_FILE")
	if filePath != "" {
		info, statErr := os.Stat(filePath)
		if statErr != nil {
			return "", fmt.Errorf("%s_FILE=%s: %w", key, filePath, statErr)
		}
		if info.Mode().Perm()&0o077 != 0 {
			fmt.Fprintf(os.Stderr, "WARNING: secret file %s has unsafe permissions %04o (group/other bits set)\n", filePath, info.Mode().Perm())
		}
		data, err := os.ReadFile(filePath)
		if err != nil {
			return "", fmt.Errorf("%s_FILE=%s: %w", key, filePath, err)
		}
		return strings.TrimSpace(string(data)), nil
	}
	return os.Getenv(key), nil
}
