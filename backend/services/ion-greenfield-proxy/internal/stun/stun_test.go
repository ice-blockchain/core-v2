package stun

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestDetectExternalIP_returnsValidAddress(t *testing.T) {
	t.Parallel()

	if os.Getenv("CI") != "" {
		t.Skip("skipping external IP detection test in CI environment")
	}

	ip, err := DetectExternalIP(5 * time.Second)
	require.NoError(t, err)
	require.NotNil(t, ip)
	require.False(t, ip.IsUnspecified(), "IP should not be 0.0.0.0")
	t.Logf("detected external IP: %s", ip.String())
}
