package cluster

import (
	"context"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func TestClaimAndOwnsBag(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x01}
	require.False(t, coord.OwnsBag(bagID))

	err := coord.ClaimBag(ctx, bagID)
	require.NoError(t, err)
	require.True(t, coord.OwnsBag(bagID))
	require.Equal(t, coord.nodeID, coord.Owner(bagID))
	// ClaimBag no longer increments counter; only OwnsOrClaim does after verification.
	require.Equal(t, 0, coord.OwnedCount())
}

func TestReleaseBag(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x02}
	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.True(t, coord.OwnsBag(bagID))

	require.NoError(t, coord.ReleaseBag(ctx, bagID))
	require.False(t, coord.OwnsBag(bagID))
}

func TestOwnsOrClaimUnclaimed(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x03}
	owned, err := coord.OwnsOrClaim(ctx, bagID)
	require.NoError(t, err)
	require.True(t, owned)
	require.True(t, coord.OwnsBag(bagID))
}

func TestOwnsOrClaimAlreadyOwned(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x04}
	// Simulate another node owning this bag with a fresh signed heartbeat.
	// writeSignedOwnershipAsNode also writes self-certifying nodeinfo.
	foreignNodeID, foreignPriv := writeSignedOwnershipAsNode(t, coord, "", bagID)
	require.NoError(t, coord.crdt.Put(ctx,
		dsKeyFromString(HeartbeatKey(foreignNodeID)),
		FormatSignedHeartbeat(time.Now().Unix(), foreignNodeID, foreignPriv)))

	owned, err := coord.OwnsOrClaim(ctx, bagID)
	require.NoError(t, err)
	require.False(t, owned)
}

func TestOwnerUnknownBag(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	require.Equal(t, "", coord.Owner([32]byte{0xFF}))
}

func TestNodeADNLAddress(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	// Verify published nodeinfo is readable.
	_, _, _, found := coord.NodeADNLAddress(coord.nodeID)
	require.True(t, found)
}

func TestMultipleBagsClaimed(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	for i := 0; i < 10; i++ {
		bagID := [32]byte{byte(i)}
		require.NoError(t, coord.ClaimBag(ctx, bagID))
	}
	// ClaimBag no longer increments counter; verify bags are owned.
	for i := 0; i < 10; i++ {
		require.True(t, coord.OwnsBag([32]byte{byte(i)}))
	}

	// Release 3.
	for i := 0; i < 3; i++ {
		bagID := [32]byte{byte(i)}
		require.NoError(t, coord.ReleaseBag(ctx, bagID))
	}
	for i := 0; i < 3; i++ {
		require.False(t, coord.OwnsBag([32]byte{byte(i)}))
	}
}

func TestOwnerRejectsStaleTimestamp(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x10}
	bagHex := hexEncode(bagID[:])

	// Write ownership claim with a timestamp older than StaleHeartbeatTimeout.
	staleTS := time.Now().Unix() - int64(coord.cfg.StaleHeartbeatTimeout.Seconds()) - 60
	val := FormatSignedOwnership(bagHex, coord.nodeID, staleTS, coord.cfg.PrivateKey)
	require.NoError(t, coord.crdt.Put(ctx, ds.NewKey(OwnershipKey(bagID)), val))

	// Owner() must reject the stale claim.
	require.Equal(t, "", coord.Owner(bagID))
}

func TestOwnerAcceptsFreshTimestamp(t *testing.T) {
	coord := newTestCoordinator(t, "")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x11}
	// ClaimBag uses time.Now(), which is within the freshness window.
	require.NoError(t, coord.ClaimBag(ctx, bagID))
	require.Equal(t, coord.nodeID, coord.Owner(bagID))
}

func TestOwnedCountConsistencyUnderConcurrency(t *testing.T) {
	coord := newTestCoordinator(t, "")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	// Use a long stale timeout so ownership claims remain valid during the test.
	coord.cfg.StaleHeartbeatTimeout = 5 * time.Minute
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	// Claim several bags so reconciliation has work.
	const bagCount = 5
	for i := range bagCount {
		bagID := [32]byte{byte(0x20 + i)}
		owned, err := coord.OwnsOrClaim(ctx, bagID)
		require.NoError(t, err)
		require.True(t, owned)
	}

	// Run reconciliation concurrently with a release.
	done := make(chan struct{})
	go func() {
		defer close(done)
		coord.reconcileOwnedCount(ctx)
	}()
	releaseBag := [32]byte{byte(0x20)}
	require.NoError(t, coord.ReleaseBag(ctx, releaseBag))
	<-done

	// After reconciliation + release, run one more reconciliation to converge.
	coord.reconcileOwnedCount(ctx)
	require.Equal(t, bagCount-1, coord.OwnedCount())
}

func dsKeyFromString(s string) ds.Key {
	return ds.NewKey(s)
}
