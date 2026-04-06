package cluster

import (
	"context"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func TestVerifyClaimSucceedsWhenOwner(t *testing.T) {
	coord := newTestCoordinator(t, "claimer")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx := context.Background()
	bagID := [32]byte{0x01}

	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.True(t, coord.verifyClaim(ctx, bagID))
}

func TestVerifyClaimFailsWhenOverwritten(t *testing.T) {
	coord := newTestCoordinator(t, "loser")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx := context.Background()
	bagID := [32]byte{0x02}

	require.NoError(t, coord.ClaimBag(ctx, bagID))

	// Simulate another node winning by overwriting the ownership key.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("winner")))

	require.False(t, coord.verifyClaim(ctx, bagID))
}

func TestVerifyClaimRespectsContextCancellation(t *testing.T) {
	coord := newTestCoordinator(t, "cancelled")
	coord.cfg.ClaimVerifyDelay = 1 * time.Second
	ctx, cancel := context.WithCancel(context.Background())
	bagID := [32]byte{0x03}

	require.NoError(t, coord.ClaimBag(ctx, bagID))
	cancel()

	require.False(t, coord.verifyClaim(ctx, bagID))
}

func TestRollbackClaimDeletesBynodeKey(t *testing.T) {
	coord := newTestCoordinator(t, "rollback-node")
	ctx := context.Background()
	bagID := [32]byte{0x04}

	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.Equal(t, int64(1), coord.ownedCount.Load())

	coord.rollbackClaim(ctx, bagID)

	require.Equal(t, int64(0), coord.ownedCount.Load())

	// Verify bynode key was deleted.
	_, err := coord.crdt.Get(ctx, ds.NewKey(ByNodeKey("rollback-node", bagID)))
	require.Error(t, err, "bynode key should be deleted after rollback")
}

func TestReconcileRemovesStaleBynodeKeys(t *testing.T) {
	coord := newTestCoordinator(t, "recon-node")
	ctx := context.Background()
	bagID := [32]byte{0x05}

	// Create bynode key for this node, but ownership points to another node.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(ByNodeKey("recon-node", bagID)), nil))
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("other-node")))
	coord.ownedCount.Store(1)

	coord.reconcileOwnedCount(ctx)

	require.Equal(t, int64(0), coord.ownedCount.Load())

	// Verify stale bynode key was cleaned up.
	_, err := coord.crdt.Get(ctx, ds.NewKey(ByNodeKey("recon-node", bagID)))
	require.Error(t, err, "stale bynode key should be deleted")
}
