package cluster

import (
	"context"
	"crypto/ed25519"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

// writeSignedOwnershipAsNode writes a signed ownership claim for bagID from
// a newly generated node. Derives nodeID from the ed25519 key (matching
// production behaviour). Returns the derived nodeID and private key.
func writeSignedOwnershipAsNode(t *testing.T, coord *Coordinator, _ string, bagID [32]byte) (string, ed25519.PrivateKey) {
	t.Helper()
	_, privKey, err := ed25519.GenerateKey(nil)
	require.NoError(t, err)
	pubKey := privKey.Public().(ed25519.PublicKey)
	nodeID := hexEncode(pubKey)

	// Register node's self-certifying nodeinfo in CRDT.
	info := NodeInfo{}
	infoBytes, err := MarshalSignedNodeInfo(info, privKey)
	require.NoError(t, err)
	require.NoError(t, coord.crdt.Put(context.Background(), ds.NewKey(NodeInfoKey(nodeID)), infoBytes))

	// Write signed ownership.
	bagHex := hexEncode(bagID[:])
	val := FormatSignedOwnership(bagHex, nodeID, time.Now().Unix(), privKey)
	require.NoError(t, coord.crdt.Put(context.Background(), ds.NewKey(OwnershipKey(bagID)), val))
	return nodeID, privKey
}

func TestVerifyClaimSucceedsWhenOwner(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx := context.Background()
	bagID := [32]byte{0x01}

	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.True(t, coord.verifyClaim(ctx, bagID))
}

func TestVerifyClaimFailsWhenOverwritten(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx := context.Background()
	bagID := [32]byte{0x02}

	require.NoError(t, coord.ClaimBag(ctx, bagID))

	// Simulate another node winning by overwriting the ownership key.
	writeSignedOwnershipAsNode(t, coord, "", bagID)

	require.False(t, coord.verifyClaim(ctx, bagID))
}

func TestVerifyClaimRespectsContextCancellation(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 1 * time.Second
	ctx, cancel := context.WithCancel(context.Background())
	bagID := [32]byte{0x03}

	require.NoError(t, coord.ClaimBag(ctx, bagID))
	cancel()

	require.False(t, coord.verifyClaim(ctx, bagID))
}

func TestRollbackClaimDeletesBynodeKey(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx := context.Background()
	bagID := [32]byte{0x04}

	require.NoError(t, coord.ClaimBag(ctx, bagID))

	coord.rollbackClaim(ctx, bagID)

	// Verify bynode key was deleted.
	_, err := coord.crdt.Get(ctx, ds.NewKey(ByNodeKey(coord.nodeID, bagID)))
	require.Error(t, err, "bynode key should be deleted after rollback")

	// Verify ownership key was deleted (this node still owned it at rollback time).
	_, err = coord.crdt.Get(ctx, ds.NewKey(OwnershipKey(bagID)))
	require.Error(t, err, "ownership key should be deleted after rollback")
}

func TestRollbackDoesNotDeleteWinnerOwnership(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx := context.Background()
	bagID := [32]byte{0x06}

	// Loser claims the bag.
	require.NoError(t, coord.ClaimBag(ctx, bagID))

	// Simulate the winner overwriting ownership.
	winnerID, _ := writeSignedOwnershipAsNode(t, coord, "", bagID)

	// Loser rolls back -- must NOT delete the winner's ownership.
	coord.rollbackClaim(ctx, bagID)

	require.Equal(t, winnerID, coord.Owner(bagID))
}

func TestCounterOnlyIncrementsAfterVerification(t *testing.T) {
	coord := newTestCoordinator(t, "")
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
	_ = coord.crdt.Delete(ctx, ds.NewKey(ByNodeKey(coord.nodeID, bagID)))

	// OwnsOrClaim with successful verification should increment counter.
	owned, err := coord.OwnsOrClaim(ctx, bagID)
	require.NoError(t, err)
	require.True(t, owned)
	require.Equal(t, 1, coord.OwnedCount())
}

func TestReconcileRemovesStaleBynodeKeys(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx := context.Background()
	bagID := [32]byte{0x05}

	// Create bynode key for this node, but ownership points to another node.
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(ByNodeKey(coord.nodeID, bagID)), nil))
	writeSignedOwnershipAsNode(t, coord, "", bagID)
	coord.ownedCountMu.Lock()
	coord.ownedCount = 1
	coord.ownedCountMu.Unlock()

	coord.reconcileOwnedCount(ctx)

	require.Equal(t, 0, coord.OwnedCount())

	// Verify stale bynode key was cleaned up.
	_, err := coord.crdt.Get(ctx, ds.NewKey(ByNodeKey(coord.nodeID, bagID)))
	require.Error(t, err, "stale bynode key should be deleted")
}
