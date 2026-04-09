package cluster

import (
	"context"
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func TestSingleNodeCoordinatorOwnsEverything(t *testing.T) {
	addr := [32]byte{0x01, 0x02}
	coord := NewSingleNodeCoordinator("node-1", addr, "127.0.0.1", 3278)

	bagID := boc.BagID{0xDE, 0xAD}
	require.True(t, coord.OwnsBag(bagID))

	owned, err := coord.OwnsOrClaim(context.Background(), bagID)
	require.NoError(t, err)
	require.True(t, owned)

	require.Equal(t, "node-1", coord.Owner(bagID))
}

func TestSingleNodeCoordinatorNodeAddress(t *testing.T) {
	addr := [32]byte{0x01, 0x02}
	coord := NewSingleNodeCoordinator("node-1", addr, "10.0.0.1", 5000)

	gotAddr, gotIP, gotPort, found := coord.NodeADNLAddress("any-node")
	require.True(t, found)
	require.Equal(t, addr, gotAddr)
	require.Equal(t, "10.0.0.1", gotIP)
	require.Equal(t, 5000, gotPort)
}

func TestSingleNodeCoordinatorHealth(t *testing.T) {
	coord := NewSingleNodeCoordinator("n", [32]byte{}, "", 0)
	require.True(t, coord.IsConnected())
	require.Equal(t, 1, coord.ActiveNodeCount())
}

func TestSingleNodeCoordinatorForwardFails(t *testing.T) {
	coord := NewSingleNodeCoordinator("n", [32]byte{}, "", 0)
	_, _, err := coord.ForwardGetPiece(context.Background(), boc.BagID{}, 0)
	require.Error(t, err)
}
