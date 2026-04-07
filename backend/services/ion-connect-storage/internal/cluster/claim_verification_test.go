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

	coord.rollbackClaim(ctx, bagID)

	// Verify bynode key was deleted.
	_, err := coord.crdt.Get(ctx, ds.NewKey(ByNodeKey("rollback-node", bagID)))
	require.Error(t, err, "bynode key should be deleted after rollback")

	// Verify ownership key was deleted (this node still owned it at rollback time).
	_, err = coord.crdt.Get(ctx, ds.NewKey(OwnershipKey(bagID)))
	require.Error(t, err, "ownership key should be deleted after rollback")
}

func TestRollbackDoesNotDeleteWinnerOwnership(t *testing.T) {
	coord := newTestCoordinator(t, "loser-node")
	ctx := context.Background()
	bagID := [32]byte{0x06}

	// Loser claims the bag.
	require.NoError(t, coord.ClaimBag(ctx, bagID))

	// Simulate the winner overwriting ownership.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), []byte("winner-node")))

	// Loser rolls back -- must NOT delete the winner's ownership.
	coord.rollbackClaim(ctx, bagID)

	require.Equal(t, "winner-node", coord.Owner(bagID))
}

func TestCounterOnlyIncrementsAfterVerification(t *testing.T) {
	coord := newTestCoordinator(t, "counter-node")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x07}

	// Bare ClaimBag should NOT increment counter.
	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.Equal(t, 0, coord.OwnedCount())

	// Clean up for OwnsOrClaim test.
	_ = coord.crdt.Delete(ctx, ds.NewKey(OwnershipKey(bagID)))
	_ = coord.crdt.Delete(ctx, ds.NewKey(ByNodeKey("counter-node", bagID)))

	// OwnsOrClaim with successful verification should increment counter.
	owned, err := coord.OwnsOrClaim(ctx, bagID)
	require.NoError(t, err)
	require.True(t, owned)
	require.Equal(t, 1, coord.OwnedCount())
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
