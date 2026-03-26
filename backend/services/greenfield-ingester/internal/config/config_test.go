package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("GREENFIELD_RPC_URLS", "https://rpc.example.com")
	t.Setenv("ONLINEIO_ENV", "dev")
	t.Setenv("GREENFIELD_PRIVATE_KEY", "abc123")
}

func TestLoad_RejectsInvalidOnlineIOEnv(t *testing.T) {
	invalid := []string{
		"dev' OR 1=1",
		`dev"`,
		"dev;drop",
		"DEV",
		"dev env",
		"dev.prod",
		"dev_test",
	}

	for _, env := range invalid {
		t.Run(env, func(t *testing.T) {
			setRequiredEnv(t)
			t.Setenv("ONLINEIO_ENV", env)

			_, err := Load()
			require.Error(t, err)
			require.Contains(t, err.Error(), "invalid characters")
		})
	}
}

func TestLoad_AcceptsValidOnlineIOEnv(t *testing.T) {
	valid := []string{"dev", "staging", "prod", "staging-1", "test-env-2"}

	for _, env := range valid {
		t.Run(env, func(t *testing.T) {
			setRequiredEnv(t)
			t.Setenv("ONLINEIO_ENV", env)

			cfg, err := Load()
			require.NoError(t, err)
			require.Equal(t, env, cfg.OnlineIOEnv)
		})
	}
}

func TestLoad_RequiresPrivateKey(t *testing.T) {
	t.Setenv("GREENFIELD_RPC_URLS", "https://rpc.example.com")
	t.Setenv("ONLINEIO_ENV", "dev")
	os.Unsetenv("GREENFIELD_PRIVATE_KEY")

	_, err := Load()
	require.Error(t, err)
	require.Contains(t, err.Error(), "GREENFIELD_PRIVATE_KEY is required")
}

func TestLoad_RequiresRpcURLs(t *testing.T) {
	os.Unsetenv("GREENFIELD_RPC_URLS")

	_, err := Load()
	require.Error(t, err)
	require.Contains(t, err.Error(), "GREENFIELD_RPC_URLS is required")
}

func TestLoad_SuccessWithAllRequiredEnv(t *testing.T) {
	setRequiredEnv(t)

	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, []string{"https://rpc.example.com"}, cfg.GreenfieldRpcURLs)
	require.Equal(t, "dev", cfg.OnlineIOEnv)
	require.Equal(t, "abc123", cfg.GreenfieldPrivKey)
}
