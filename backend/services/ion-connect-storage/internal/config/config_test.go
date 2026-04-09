package config

import (
	"crypto/ed25519"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func randomHexKey(t *testing.T) string {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(nil)
	require.NoError(t, err)
	return hex.EncodeToString(priv.Seed())
}

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("ADNL_PRIVATE_KEY", randomHexKey(t))
	t.Setenv("ADNL_PRIVATE_KEY_FILE", "")
	t.Setenv("PORT", "3278")
	t.Setenv("ADNL_EXTERNAL_ADDR", "1.2.3.4:3278")
	t.Setenv("GLOBAL_CONFIG_URL", "https://67.29.155.42/testnet-global.config.json")
	t.Setenv("GREENFIELD_RPC_URLS", "https://93.184.216.34")
	t.Setenv("GREENFIELD_PRIVATE_KEY", randomHexKey(t))
	t.Setenv("GREENFIELD_PRIVATE_KEY_FILE", "")
	t.Setenv("ONLINEIO_ENV", "dev")
}

func TestLoad_AllRequired_Success(t *testing.T) {
	setRequiredEnv(t)
	cfg, err := Load()
	require.NoError(t, err)
	require.Len(t, cfg.AdnlPrivateKey, 64, "ADNL private key should be 64 hex chars")
	require.Equal(t, 3278, cfg.AdnlPort)
	require.Equal(t, "1.2.3.4:3278", cfg.AdnlExternalAddr)
	require.Equal(t, "https://67.29.155.42/testnet-global.config.json", cfg.GlobalConfigURL)
	require.Equal(t, []string{"https://93.184.216.34"}, cfg.GreenfieldRpcURLs)
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

func TestValidateURLRejectsLocalhostHostname(t *testing.T) {
	err := validateURL("https://localhost/path")
	require.Error(t, err)
	require.Contains(t, err.Error(), "private/restricted IP")
}

func TestValidateURLRejectsPrivateIP(t *testing.T) {
	err := validateURL("https://10.0.0.1/path")
	require.Error(t, err)
	require.Contains(t, err.Error(), "private/restricted IP")
}

func TestValidateURLRejectsLoopbackIP(t *testing.T) {
	err := validateURL("https://127.0.0.1/path")
	require.Error(t, err)
}

func TestValidateURLRejectsLinkLocal(t *testing.T) {
	err := validateURL("https://169.254.169.254/latest/meta-data/")
	require.Error(t, err)
}

func TestValidateIPAcceptsPublicIP(t *testing.T) {
	err := validateURL("https://93.184.216.34/path")
	require.NoError(t, err)
}

func TestLoad_CommaSeparatedURLs(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GREENFIELD_RPC_URLS", " https://93.184.216.34 , https://93.184.216.35 , ")
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, []string{"https://93.184.216.34", "https://93.184.216.35"}, cfg.GreenfieldRpcURLs)
}

func TestLoad_InvalidShardCount_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("SHARD_COUNT", "abc")
	_, err := Load()
	require.ErrorContains(t, err, "SHARD_COUNT")
	require.ErrorContains(t, err, "invalid integer")
}

func TestLoad_InvalidCacheTTL_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("CACHE_TTL", "24hours")
	_, err := Load()
	require.ErrorContains(t, err, "CACHE_TTL")
	require.ErrorContains(t, err, "invalid duration")
}

func TestLoad_InvalidHeartbeatInterval_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("HEARTBEAT_INTERVAL", "not-a-duration")
	_, err := Load()
	require.ErrorContains(t, err, "HEARTBEAT_INTERVAL")
}

func TestLoad_FileSchemeGlobalConfig_InCurrentDir(t *testing.T) {
	setRequiredEnv(t)
	cwd, err := os.Getwd()
	require.NoError(t, err)
	t.Setenv("GLOBAL_CONFIG_URL", "file://"+cwd+"/global-config.json")
	cfg, loadErr := Load()
	require.NoError(t, loadErr)
	require.Equal(t, "file://"+cwd+"/global-config.json", cfg.GlobalConfigURL)
}

func TestLoad_FileSchemeGlobalConfig_OutsideDir_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GLOBAL_CONFIG_URL", "file:///etc/passwd")
	_, err := Load()
	require.ErrorContains(t, err, "outside working directory")
}

func TestLoad_FileSchemeGlobalConfig_Traversal_Error(t *testing.T) {
	setRequiredEnv(t)
	cwd, err := os.Getwd()
	require.NoError(t, err)
	t.Setenv("GLOBAL_CONFIG_URL", "file://"+cwd+"/../../../etc/passwd")
	_, loadErr := Load()
	require.ErrorContains(t, loadErr, "outside working directory")
}

func TestLoad_FileSchemeGlobalConfig_Root_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GLOBAL_CONFIG_URL", "file:///")
	_, err := Load()
	require.ErrorContains(t, err, "outside working directory")
}

func TestLoad_FileSchemeGlobalConfig_DotSlashTraversal_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GLOBAL_CONFIG_URL", "file://./../../../etc/passwd")
	_, err := Load()
	require.ErrorContains(t, err, "outside working directory")
}

func TestLoad_FileSchemeGlobalConfig_CwdItself_Error(t *testing.T) {
	setRequiredEnv(t)
	cwd, err := os.Getwd()
	require.NoError(t, err)
	t.Setenv("GLOBAL_CONFIG_URL", "file://"+cwd)
	_, loadErr := Load()
	require.ErrorContains(t, loadErr, "must point to a file")
}

func TestLoad_FileSchemeGlobalConfig_DotOnly_Error(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("GLOBAL_CONFIG_URL", "file:///.")
	_, err := Load()
	require.ErrorContains(t, err, "outside working directory")
}

func TestSecretFromEnvOrFile_UnreadableFile_Error(t *testing.T) {
	t.Setenv("TEST_SECRET_FILE", "/nonexistent/path/to/secret")
	t.Setenv("TEST_SECRET", "fallback-value")
	_, err := secretFromEnvOrFile("TEST_SECRET")
	require.Error(t, err)
	require.ErrorContains(t, err, "TEST_SECRET_FILE")
}

func TestSecretFromEnvOrFile_ReadsFromFile(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/secret.txt"
	require.NoError(t, os.WriteFile(path, []byte("  file-secret  \n"), 0o600))
	t.Setenv("TEST_KEY_FILE", path)
	t.Setenv("TEST_KEY", "env-value")
	val, err := secretFromEnvOrFile("TEST_KEY")
	require.NoError(t, err)
	require.Equal(t, "file-secret", val)
}

func TestSecretFromEnvOrFile_FallsBackToEnv(t *testing.T) {
	t.Setenv("TEST_KEY_FILE", "")
	t.Setenv("TEST_KEY", "env-value")
	val, err := secretFromEnvOrFile("TEST_KEY")
	require.NoError(t, err)
	require.Equal(t, "env-value", val)
}
