package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("ADNL_PRIVATE_KEY", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2")
	t.Setenv("PORT", "3278")
	t.Setenv("ADNL_EXTERNAL_ADDR", "1.2.3.4:3278")
	t.Setenv("GLOBAL_CONFIG_URL", "https://ton.org/testnet-global.config.json")
	t.Setenv("GREENFIELD_RPC_URLS", "https://rpc1.example.com")
	t.Setenv("GREENFIELD_PRIVATE_KEY", "deadbeef")
	t.Setenv("ONLINEIO_ENV", "dev")
}

func TestLoad_AllRequired_Success(t *testing.T) {
	setRequiredEnv(t)
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", cfg.AdnlPrivateKey)
	require.Equal(t, 3278, cfg.AdnlPort)
	require.Equal(t, "1.2.3.4:3278", cfg.AdnlExternalAddr)
	require.Equal(t, "https://ton.org/testnet-global.config.json", cfg.GlobalConfigURL)
	require.Equal(t, []string{"https://rpc1.example.com"}, cfg.GreenfieldRpcURLs)
	require.Equal(t, "dev", cfg.OnlineIOEnv)
}

func TestLoad_MissingAdnlKey_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ADNL_PRIVATE_KEY", "")
	_, err := Load()
	require.ErrorContains(t, err, "ADNL_PRIVATE_KEY is required")
}

func TestLoad_MissingGlobalConfig_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GLOBAL_CONFIG_URL", "")
	_, err := Load()
	require.ErrorContains(t, err, "GLOBAL_CONFIG_URL is required")
}

func TestLoad_MissingPort_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("PORT", "")
	_, err := Load()
	require.ErrorContains(t, err, "PORT is required")
}

func TestLoad_MissingExternalAddr_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ADNL_EXTERNAL_ADDR", "")
	_, err := Load()
	require.ErrorContains(t, err, "ADNL_EXTERNAL_ADDR is required")
}

func TestLoad_InvalidPort_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("PORT", "0")
	_, err := Load()
	require.ErrorContains(t, err, "between 1 and 65535")
}

func TestLoad_Defaults(t *testing.T) {
	setRequiredEnv(t)
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, 24*time.Hour, cfg.CacheTTL)
	require.Equal(t, "/data/cache", cfg.CacheDir)
	require.Equal(t, "/data/db", cfg.DataDir)
	require.Equal(t, 0, cfg.ShardIndex)
	require.Equal(t, 1, cfg.ShardCount)
	require.Equal(t, 100000, cfg.ActiveDHTLimit)
	require.Equal(t, "8080", cfg.HttpPort)
	require.Equal(t, "", cfg.MetricsPort)
	require.Equal(t, "info", cfg.LogLevel)
	require.Equal(t, "greenfield_1017-1", cfg.GreenfieldChainID)
}

func TestLoad_InvalidAdnlKeyLength_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ADNL_PRIVATE_KEY", "a1b2c3")
	_, err := Load()
	require.ErrorContains(t, err, "64 hex characters")
}

func TestLoad_InvalidAdnlKeyHex_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ADNL_PRIVATE_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
	_, err := Load()
	require.ErrorContains(t, err, "not valid hex")
}

func TestLoad_CommaSeparatedURLs(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GREENFIELD_RPC_URLS", " https://rpc1.example.com , https://rpc2.example.com , ")
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, []string{"https://rpc1.example.com", "https://rpc2.example.com"}, cfg.GreenfieldRpcURLs)
}
