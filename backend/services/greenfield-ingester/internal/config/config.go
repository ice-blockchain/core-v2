package config

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

var validEnvPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

// Config holds all configuration for the greenfield-ingester service.
type Config struct {
	GreenfieldRpcURLs []string
	GreenfieldChainID string
	GreenfieldPrivKey string
	OnlineIOEnv       string
	RedisURL          string
	QueueName         string
	LogLevel          string
}

// Load reads configuration from environment variables.
func Load() (Config, error) {
	rpcURLs := os.Getenv("GREENFIELD_RPC_URLS")
	if rpcURLs == "" {
		return Config{}, fmt.Errorf("GREENFIELD_RPC_URLS is required")
	}

	var urls []string
	for _, u := range strings.Split(rpcURLs, ",") {
		u = strings.TrimSpace(u)
		if u != "" {
			urls = append(urls, u)
		}
	}
	if len(urls) == 0 {
		return Config{}, fmt.Errorf("GREENFIELD_RPC_URLS contains no valid URLs")
	}

	chainID := os.Getenv("GREENFIELD_CHAIN_ID")
	if chainID == "" {
		chainID = "greenfield_1017-1"
	}

	onlineIOEnv := os.Getenv("ONLINEIO_ENV")
	if onlineIOEnv == "" {
		return Config{}, fmt.Errorf("ONLINEIO_ENV is required")
	}
	if !validEnvPattern.MatchString(onlineIOEnv) {
		return Config{}, fmt.Errorf("ONLINEIO_ENV contains invalid characters: %q", onlineIOEnv)
	}

	privKey := os.Getenv("GREENFIELD_PRIVATE_KEY")
	if privKey == "" {
		return Config{}, fmt.Errorf("GREENFIELD_PRIVATE_KEY is required")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	queueName := os.Getenv("QUEUE_NAME")
	if queueName == "" {
		queueName = "greenfield-events"
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	return Config{
		GreenfieldRpcURLs: urls,
		GreenfieldChainID: chainID,
		GreenfieldPrivKey: privKey,
		OnlineIOEnv:       onlineIOEnv,
		RedisURL:          redisURL,
		QueueName:         queueName,
		LogLevel:          logLevel,
	}, nil
}
