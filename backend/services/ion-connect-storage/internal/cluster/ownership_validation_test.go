package cluster

import (
	"context"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func TestValidatedOwnerReturnsSelfWithoutHeartbeatCheck(t *testing.T) {
	coord := newTestCoordinator(t, "self-node")
	ctx := context.Background()
	bagID := [32]byte{0xaa, 0xbb}

	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("self-node")))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "self-node", owner)
}

func TestValidatedOwnerRejectsNodeWithoutHeartbeat(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	ctx := context.Background()
	bagID := [32]byte{0xcc, 0xdd}

	// Foreign node claims ownership but has no heartbeat.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("foreign-node")))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "", owner, "should reject owner without heartbeat")
}

func TestValidatedOwnerAcceptsAliveNode(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	ctx := context.Background()
	bagID := [32]byte{0xee, 0xff}

	// Foreign node claims ownership and has a fresh heartbeat.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("alive-node")))
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("alive-node")),
		FormatHeartbeat(time.Now().Unix())))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "alive-node", owner)
}

func TestValidatedOwnerRejectsStaleHeartbeat(t *testing.T) {
	coord := newTestCoordinator(t, "local-node")
	ctx := context.Background()
	bagID := [32]byte{0x11, 0x22}

	// Foreign node has a stale heartbeat (older than StaleHeartbeatTimeout).
	staleTimestamp := time.Now().Unix() - int64(coord.cfg.StaleHeartbeatTimeout.Seconds()) - 10
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("stale-node")))
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(HeartbeatKey("stale-node")),
		FormatHeartbeat(staleTimestamp)))

	owner := coord.ValidatedOwner(bagID)
	require.Equal(t, "", owner, "should reject owner with stale heartbeat")
}
