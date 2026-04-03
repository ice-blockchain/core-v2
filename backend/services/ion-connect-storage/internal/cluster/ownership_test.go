package cluster

import (
	"context"
	"testing"

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
	require.Equal(t, 1, coord.OwnedCount())
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
	require.Equal(t, 0, coord.OwnedCount())
}

func TestOwnsOrClaimUnclaimed(t *testing.T) {
	coord := newTestCoordinator(t, "claimer")
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
	ctx, cancel := context.WithCancel(context.Background())
	require.NoError(t, coord.Start(ctx))
	defer func() { cancel(); coord.Stop() }()

	bagID := [32]byte{0x04}
	// Simulate another node owning this bag by writing directly.
	require.NoError(t, coord.crdt.Put(ctx,
		dsKeyFromString(OwnershipKey(bagID)), []byte("node-b")))

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
	require.Equal(t, 10, coord.OwnedCount())

	// Release 3.
	for i := 0; i < 3; i++ {
		bagID := [32]byte{byte(i)}
		require.NoError(t, coord.ReleaseBag(ctx, bagID))
	}
	require.Equal(t, 7, coord.OwnedCount())
}

func dsKeyFromString(s string) ds.Key {
	return ds.NewKey(s)
}
