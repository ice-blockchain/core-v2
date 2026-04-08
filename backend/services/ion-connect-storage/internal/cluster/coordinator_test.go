package cluster

import (
	"context"
	"crypto/ed25519"
	"log/slog"
	"os"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

// newTestCoordinator creates a coordinator with nodeID derived from the
// generated ed25519 key (matching production behaviour). The label parameter
// is ignored — use coord.nodeID to reference this node in tests.
func newTestCoordinator(t *testing.T, _ string) *Coordinator {
	t.Helper()
	db := openTestDB(t)
	_, privKey, err := ed25519.GenerateKey(nil)
	require.NoError(t, err)
	pubKey := privKey.Public().(ed25519.PublicKey)
	nodeID := hexEncode(pubKey)
	coord, err := NewCoordinator(CoordinatorConfig{
		NodeID:                nodeID,
		ClusterOverlayID:      "test-overlay",
		DB:                    db,
		Logger:                slog.New(slog.NewTextHandler(os.Stderr, nil)),
		HeartbeatInterval:     200 * time.Millisecond,
		ReclamationInterval:   500 * time.Millisecond,
		StaleHeartbeatTimeout: 1 * time.Second,
		PrivateKey:            privKey,
	})
	require.NoError(t, err)
	// Publish nodeinfo so Owner() can verify this node's signed claims.
	require.NoError(t, coord.publishNodeInfo(context.Background()))
	return coord
}

func TestCoordinatorStartStop(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())

	err := coord.Start(ctx)
	require.NoError(t, err)

	val, err := coord.crdt.Get(ctx, ds.NewKey(NodeInfoKey(coord.nodeID)))
	require.NoError(t, err)
	info, err := UnmarshalNodeInfo(val)
	require.NoError(t, err)
	// ADNLAddress comes from config; empty in test.
	require.NotNil(t, info)

	cancel()
	coord.Stop()
}

func TestCoordinatorHeartbeatWritten(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	defer func() { cancel(); coord.Stop() }()

	require.NoError(t, coord.Start(ctx))
	time.Sleep(300 * time.Millisecond)

	val, err := coord.crdt.Get(ctx, ds.NewKey(HeartbeatKey(coord.nodeID)))
	require.NoError(t, err)

	pubKey := coord.cfg.PrivateKey.Public().(ed25519.PublicKey)
	ts, err := ParseSignedHeartbeat(val, coord.nodeID, pubKey)
	require.NoError(t, err)
	require.InDelta(t, time.Now().Unix(), ts, 5)
}

func TestCoordinatorIsConnectedFalseBeforeStart(t *testing.T) {
	coord := newTestCoordinator(t, "")
	require.False(t, coord.IsConnected())
}

func TestCoordinatorIsConnectedTrueAfterStart(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	defer func() { cancel(); coord.Stop() }()

	require.NoError(t, coord.Start(ctx))
	require.True(t, coord.IsConnected())
}

func TestCoordinatorIsConnectedFalseAfterStop(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())

	require.NoError(t, coord.Start(ctx))
	require.True(t, coord.IsConnected())

	cancel()
	coord.Stop()
	require.False(t, coord.IsConnected())
}
