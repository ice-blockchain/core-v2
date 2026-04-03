package cluster

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func newTestCoordinator(t *testing.T, nodeID string) *Coordinator {
	t.Helper()
	db := openTestDB(t)
	coord, err := NewCoordinator(CoordinatorConfig{
		NodeID:                nodeID,
		ClusterOverlayID:      "test-overlay",
		DB:                    db,
		Logger:                slog.New(slog.NewTextHandler(os.Stderr, nil)),
		HeartbeatInterval:     200 * time.Millisecond,
		ReclamationInterval:   500 * time.Millisecond,
		StaleHeartbeatTimeout: 1 * time.Second,
	})
	require.NoError(t, err)
	return coord
}

func TestCoordinatorStartStop(t *testing.T) {
	coord := newTestCoordinator(t, "node-1")
	ctx, cancel := context.WithCancel(context.Background())

	err := coord.Start(ctx)
	require.NoError(t, err)

	val, err := coord.crdt.Get(ctx, ds.NewKey(NodeInfoKey("node-1")))
	require.NoError(t, err)
	info, err := UnmarshalNodeInfo(val)
	require.NoError(t, err)
	require.Equal(t, "node-1", info.ADNLAddress)

	cancel()
	coord.Stop()
}

func TestCoordinatorHeartbeatWritten(t *testing.T) {
	coord := newTestCoordinator(t, "node-hb")
	ctx, cancel := context.WithCancel(context.Background())
	defer func() { cancel(); coord.Stop() }()

	require.NoError(t, coord.Start(ctx))
	time.Sleep(300 * time.Millisecond)

	val, err := coord.crdt.Get(ctx, ds.NewKey(HeartbeatKey("node-hb")))
	require.NoError(t, err)

	ts, err := ParseHeartbeat(val)
	require.NoError(t, err)
	require.InDelta(t, time.Now().Unix(), ts, 5)
}
