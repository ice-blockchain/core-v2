package cluster

import (
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func newTestCoordinatorWithCleanup(t *testing.T, nodeID string) *Coordinator {
	t.Helper()
	coord := newTestCoordinator(t, nodeID)
	t.Cleanup(func() { coord.crdt.Close() })
	return coord
}

func TestResponsibilityRing(t *testing.T) {
	coord := newTestCoordinatorWithCleanup(t, "")

	// Use coord.nodeID as one of the active nodes so it matches.
	activeNodes := []string{coord.nodeID, "node-B", "node-C"}
	deadNode := "dead-node-X"

	responsibleCount := 0
	for _, nodeID := range activeNodes {
		coord.nodeID = nodeID
		if coord.isResponsibleForReclamation(deadNode, activeNodes) {
			responsibleCount++
		}
	}
	require.Equal(t, 1, responsibleCount, "exactly one node should be responsible")
}

func TestResponsibilityRingDeterministic(t *testing.T) {
	coord := newTestCoordinatorWithCleanup(t, "")
	activeNodes := []string{coord.nodeID, "node-B", "node-C"}

	var winner string
	for i := 0; i < 10; i++ {
		for _, nodeID := range activeNodes {
			coord.nodeID = nodeID
			if coord.isResponsibleForReclamation("dead-node", activeNodes) {
				if winner == "" {
					winner = nodeID
				}
				require.Equal(t, winner, nodeID, "responsibility must be deterministic")
			}
		}
	}
	require.NotEmpty(t, winner)
}

func TestResponsibilityRingSingleNode(t *testing.T) {
	coord := newTestCoordinatorWithCleanup(t, "")
	require.True(t, coord.isResponsibleForReclamation("dead", []string{coord.nodeID}))
}

func TestExtractBagIDFromByNodeKey(t *testing.T) {
	nodeID := "test-node"
	bagID := boc.BagID{0xAB, 0xCD, 0xEF}
	key := "/" + ByNodeKey(nodeID, bagID)

	extracted := extractBagIDFromByNodeKey(key, nodeID)
	require.Equal(t, bagID, extracted)
}

func TestExtractBagIDInvalidKey(t *testing.T) {
	result := extractBagIDFromByNodeKey("/invalid", "node")
	require.Equal(t, boc.BagID{}, result)
}

func TestSimpleHashDeterministic(t *testing.T) {
	h1 := simpleHash("test-node")
	h2 := simpleHash("test-node")
	require.Equal(t, h1, h2)

	// Different inputs produce different hashes.
	h3 := simpleHash("other-node")
	require.NotEqual(t, h1, h3)
}

func TestXorDistance(t *testing.T) {
	require.Equal(t, uint64(0), xorDistance(42, 42))
	require.Equal(t, uint64(3), xorDistance(1, 2))
}
