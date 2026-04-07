package greenfield

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseBNBToWei_AcceptsValid(t *testing.T) {
	t.Parallel()
	wei, err := parseBNBToWei("0.001")
	require.NoError(t, err)
	require.True(t, wei.IsPositive(), "expected positive wei amount")
}

func TestParseBNBToWei_RejectsZero(t *testing.T) {
	t.Parallel()
	_, err := parseBNBToWei("0")
	require.ErrorContains(t, err, "positive")
}

func TestParseBNBToWei_RejectsNegative(t *testing.T) {
	t.Parallel()
	_, err := parseBNBToWei("-1")
	require.ErrorContains(t, err, "positive")
}

func TestParseBNBToWei_RejectsExceedingMax(t *testing.T) {
	t.Parallel()
	_, err := parseBNBToWei("2")
	require.ErrorContains(t, err, "exceeds maximum")
}

func TestParseBNBToWei_AcceptsMaxBoundary(t *testing.T) {
	t.Parallel()
	wei, err := parseBNBToWei("1")
	require.NoError(t, err)
	require.True(t, wei.IsPositive())
}
