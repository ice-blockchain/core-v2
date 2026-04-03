package config

import (
	"encoding/hex"
	"fmt"
	"os"
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
	NodeID                string
	HeartbeatInterval     time.Duration
	ReclamationInterval   time.Duration
	StaleHeartbeatTimeout time.Duration
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
	adnlKey := os.Getenv("ADNL_PRIVATE_KEY")
	if err := validateAdnlKey(adnlKey); err != nil {
		return Config{}, err
	}

	globalConfigURL := os.Getenv("GLOBAL_CONFIG_URL")
	if globalConfigURL == "" {
		return Config{}, fmt.Errorf("GLOBAL_CONFIG_URL is required")
	}

	rpcURLs, err := parseRpcURLs(os.Getenv("GREENFIELD_RPC_URLS"))
	if err != nil {
		return Config{}, err
	}

	onlineIOEnv := os.Getenv("ONLINEIO_ENV")
	if onlineIOEnv == "" {
		return Config{}, fmt.Errorf("ONLINEIO_ENV is required")
	}

	greenfieldPrivKey := os.Getenv("GREENFIELD_PRIVATE_KEY")
	if greenfieldPrivKey == "" {
		return Config{}, fmt.Errorf("GREENFIELD_PRIVATE_KEY is required")
	}

	adnlPort, err := parseRequiredPort("PORT")
	if err != nil {
		return Config{}, err
	}

	adnlExternalAddr := os.Getenv("ADNL_EXTERNAL_ADDR")
	if adnlExternalAddr == "" {
		return Config{}, fmt.Errorf("ADNL_EXTERNAL_ADDR is required (e.g. 1.2.3.4:3278)")
	}

	cacheTTL := parseDuration("CACHE_TTL", 24*time.Hour)
	shardIndex := parseInt("SHARD_INDEX", 0)
	shardCount := parseInt("SHARD_COUNT", 1)
	activeDHTLimit := parseInt("ACTIVE_DHT_LIMIT", 100000)

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
		NodeID:                os.Getenv("NODE_ID"),
		HeartbeatInterval:     parseDuration("HEARTBEAT_INTERVAL", 60*time.Second),
		ReclamationInterval:   parseDuration("RECLAMATION_INTERVAL", 5*time.Minute),
		StaleHeartbeatTimeout: parseDuration("STALE_HEARTBEAT_TIMEOUT", 10*time.Minute),
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
	if len(key) != 64 {
		return fmt.Errorf("ADNL_PRIVATE_KEY must be 64 hex characters (32 bytes), got %d", len(key))
	}
	if _, err := hex.DecodeString(key); err != nil {
		return fmt.Errorf("ADNL_PRIVATE_KEY is not valid hex: %w", err)
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
			urls = append(urls, u)
		}
	}
	if len(urls) == 0 {
		return nil, fmt.Errorf("GREENFIELD_RPC_URLS contains no valid URLs")
	}
	return urls, nil
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

func parseInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func parseDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
