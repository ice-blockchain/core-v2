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

	overlayID1 := ComputeOverlayID([32]byte{1})
	overlayID2 := ComputeOverlayID([32]byte{2})
	overlayID3 := ComputeOverlayID([32]byte{3})

	_, found1 := m.LookupBagID(overlayID1)
	_, found2 := m.LookupBagID(overlayID2)
	_, found3 := m.LookupBagID(overlayID3)

	require.False(t, found1, "bag 1 should be evicted")
	require.True(t, found2, "bag 2 should remain")
	require.True(t, found3, "bag 3 should remain")
}

func TestOverlayManager_LookupBagID(t *testing.T) {
	m := newOverlayManager(10, testLogger())
	bagID := [32]byte{42}

	_ = m.Join(context.Background(), bagID)

	overlayID := ComputeOverlayID(bagID)
	resolved, ok := m.LookupBagID(overlayID)
	require.True(t, ok)
	require.Equal(t, bagID, resolved)
}

func TestOverlayManager_HandleIncomingQuery(t *testing.T) {
	m := newOverlayManager(10, testLogger())
	bagID := [32]byte{7}

	var receivedBagID [32]byte
	var receivedQuery []byte
	m.SetQueryHandler(func(_ context.Context, id [32]byte, raw []byte) ([]byte, error) {
		receivedBagID = id
		receivedQuery = raw
		return []byte("response"), nil
	})

	_ = m.Join(context.Background(), bagID)

	overlayID := ComputeOverlayID(bagID)
	resp, err := m.HandleIncomingQuery(context.Background(), overlayID, []byte("query"))
	require.NoError(t, err)
	require.Equal(t, bagID, receivedBagID)
	require.Equal(t, []byte("query"), receivedQuery)
	require.Equal(t, []byte("response"), resp)
}

func TestOverlayManager_HandleIncomingQueryUnknownOverlay(t *testing.T) {
	m := newOverlayManager(10, testLogger())
	m.SetQueryHandler(func(_ context.Context, _ [32]byte, _ []byte) ([]byte, error) {
		return nil, nil
	})

	unknownOverlay := ComputeOverlayID([32]byte{99})
	_, err := m.HandleIncomingQuery(context.Background(), unknownOverlay, []byte("query"))
	require.Error(t, err)
	require.Contains(t, err.Error(), "overlay not active")
}
