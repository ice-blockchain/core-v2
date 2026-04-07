package cluster

import (
	"context"
	"testing"
	"time"

	ds "github.com/ipfs/go-datastore"
	"github.com/stretchr/testify/require"
)

func TestClaimAndOwnsBag(t *testing.T) {
	coord := newTestCoordinator(t, "owner-node")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x01}
	require.False(t, coord.OwnsBag(bagID))

	err := coord.ClaimBag(ctx, bagID)
	require.NoError(t, err)
	require.True(t, coord.OwnsBag(bagID))
	require.Equal(t, "owner-node", coord.Owner(bagID))
	// ClaimBag no longer increments counter; only OwnsOrClaim does after verification.
	require.Equal(t, 0, coord.OwnedCount())
}

func TestReleaseBag(t *testing.T) {
	coord := newTestCoordinator(t, "releaser")
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
	coord := newTestCoordinator(t, "claimer")
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
	coord := newTestCoordinator(t, "node-a")
	coord.cfg.ClaimVerifyDelay = 10 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x04}
	// Simulate another node owning this bag with a fresh heartbeat.
	require.NoError(t, coord.crdt.Put(ctx,
		dsKeyFromString(OwnershipKey(bagID)), []byte("node-b")))
	require.NoError(t, coord.crdt.Put(ctx,
		dsKeyFromString(HeartbeatKey("node-b")), FormatHeartbeat(time.Now().Unix())))

	owned, err := coord.OwnsOrClaim(ctx, bagID)
	require.NoError(t, err)
	require.False(t, owned)
}

func TestOwnerUnknownBag(t *testing.T) {
	coord := newTestCoordinator(t, "node-x")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	require.Equal(t, "", coord.Owner([32]byte{0xFF}))
}

func TestNodeADNLAddress(t *testing.T) {
	coord := newTestCoordinator(t, "addr-node")
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	// Verify published nodeinfo is readable.
	_, _, _, found := coord.NodeADNLAddress("addr-node")
	require.True(t, found)
}

func TestMultipleBagsClaimed(t *testing.T) {
	coord := newTestCoordinator(t, "multi")
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

func dsKeyFromString(s string) ds.Key {
	return ds.NewKey(s)
}
