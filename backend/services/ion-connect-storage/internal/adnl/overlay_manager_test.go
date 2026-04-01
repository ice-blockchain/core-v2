package adnl

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestOverlayManager_JoinLeave(t *testing.T) {
	m := newOverlayManager(10, testLogger())
	bagID := [32]byte{1}

	err := m.Join(context.Background(), bagID)
	require.NoError(t, err)
	require.Equal(t, 1, m.ActiveCount())

	err = m.Leave(bagID)
	require.NoError(t, err)
	require.Equal(t, 0, m.ActiveCount())
}

func TestOverlayManager_JoinIdempotent(t *testing.T) {
	m := newOverlayManager(10, testLogger())
	bagID := [32]byte{2}

	_ = m.Join(context.Background(), bagID)
	_ = m.Join(context.Background(), bagID)
	require.Equal(t, 1, m.ActiveCount())
}

func TestOverlayManager_LRUEviction(t *testing.T) {
	m := newOverlayManager(2, testLogger())

	_ = m.Join(context.Background(), [32]byte{1})
	_ = m.Join(context.Background(), [32]byte{2})
	_ = m.Join(context.Background(), [32]byte{3})

	require.Equal(t, 2, m.ActiveCount())
	require.False(t, m.overlays.Contains([32]byte{1}))
	require.True(t, m.overlays.Contains([32]byte{2}))
	require.True(t, m.overlays.Contains([32]byte{3}))
}
