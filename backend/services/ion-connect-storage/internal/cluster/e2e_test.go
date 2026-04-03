//go:build e2e

package cluster_test

import (
	"bytes"
	"context"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
	tonstorage "github.com/xssnick/tonutils-storage/storage"
)

// TestE2E_ClusterThreeNodeDistribution starts 3 nodes, uploads 3 bags to
// Greenfield. Each node's subscriber picks up all events; OwnsOrClaim assigns
// each bag to exactly one node. Verifies all PebbleDB layers, provider index
// over RLDP, and download from the owning node.
func TestE2E_ClusterThreeNodeDistribution(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
	defer cancel()

	node0 := startClusterNode(t, ctx)
	node1 := startClusterNode(t, ctx)
	node2 := startClusterNode(t, ctx)
	nodes := []*clusterNode{node0, node1, node2}
	t.Logf("cluster started: %s / %s / %s", node0.nodeID[:12], node1.nodeID[:12], node2.nodeID[:12])

	// Upload 3 bags to Greenfield. All subscribers will see the events.
	bagID0, payload0, _, _ := uploadBag(t, ctx, 64*1024+137, "bag0")
	bagID1, _, _, _ := uploadBag(t, ctx, 128*1024+42, "bag1")
	bagID2, _, _, _ := uploadBag(t, ctx, 32*1024+99, "bag2")
	bagIDs := [][32]byte{bagID0, bagID1, bagID2}

	// Wait for all bags to be indexed on at least one node.
	for _, bagID := range bagIDs {
		waitForBagIndexedOnAnyNode(t, nodes, bagID, 3*time.Minute)
	}

	t.Run("each bag owned by exactly one node", func(t *testing.T) {
		for _, bagID := range bagIDs {
			ownerCount := 0
			for _, n := range nodes {
				if n.coordinator.OwnsBag(bagID) {
					ownerCount++
				}
			}
			require.Equal(t, 1, ownerCount, "bag %s should be owned by exactly 1 node", hex.EncodeToString(bagID[:8]))
		}
	})

	t.Run("idx and prov populated on owning node", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		require.NotNil(t, owner)

		loc, found, err := owner.env.Persister.LookupBag(bagID0)
		require.NoError(t, err)
		require.True(t, found, "idx/bag should exist on owner")
		require.NotEmpty(t, loc.BucketName)

		records, err := owner.env.ProviderIndex.Lookup(bagID0)
		require.NoError(t, err)
		require.NotEmpty(t, records, "prov/ should have records on owner")
	})

	t.Run("crdt ownership key populated", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		require.Equal(t, owner.nodeID, owner.coordinator.Owner(bagID0))
	})

	t.Run("provider index over RLDP", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		lookup := queryProviderOverRLDP(t, owner, bagID0)
		require.NotEmpty(t, lookup.Providers)
	})

	t.Run("download bag0 from owning node", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		downTorrent, downSrv := storage.SetupDownloader(t, bagID0, owner.env.Server.DHTClient())
		storage.ConnectDownloaderToNode(t, downTorrent, downSrv, owner.env.Server)
		storage.WaitForDownloadComplete(t, downTorrent, 60*time.Second)
		verifyPayload(t, downTorrent, payload0)
		downTorrent.Stop()
		downTorrent.Wait()
		downSrv.Stop()
	})

	t.Run("meta populated after download", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		hasMeta, err := owner.env.MetadataStore.HasBagMetadata(bagID0)
		require.NoError(t, err)
		require.True(t, hasMeta)
	})

	t.Run("segment cache populated after download", func(t *testing.T) {
		owner := findOwner(nodes, bagID0)
		segCount := (len(payload0) + boc.SegmentSize - 1) / boc.SegmentSize
		for i := range segCount {
			require.True(t, owner.env.SegmentCache.HasSegment(bagID0, i), "segment %d missing", i)
		}
	})
}

// TestE2E_ClusterDownloadFromNonOwningNode downloads through a node that
// does NOT own the bag, exercising the piece forwarding path.
func TestE2E_ClusterDownloadFromNonOwningNode(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
	defer cancel()

	ownerNode := startClusterNode(t, ctx)
	proxyNode := startClusterNode(t, ctx)
	t.Logf("owner=%s proxy=%s", ownerNode.nodeID[:12], proxyNode.nodeID[:12])

	bagID, payload, _, _ := uploadBag(t, ctx, 48*1024+77, "forward")

	// Wait for owner to index the bag.
	storage.WaitForBagIndexed(t, ownerNode.env.Persister, bagID, 3*time.Minute)
	require.True(t, ownerNode.coordinator.OwnsBag(bagID))
	require.False(t, proxyNode.coordinator.OwnsBag(bagID))

	// Download through the proxy node (not the owner).
	// Handler sees OwnsBag=false -> calls PieceForwarder -> forwards to owner.
	downTorrent, downSrv := storage.SetupDownloader(t, bagID, proxyNode.env.Server.DHTClient())
	storage.ConnectDownloaderToNode(t, downTorrent, downSrv, proxyNode.env.Server)
	storage.WaitForDownloadComplete(t, downTorrent, 60*time.Second)
	verifyPayload(t, downTorrent, payload)

	downTorrent.Stop()
	downTorrent.Wait()
	downSrv.Stop()
}

// TestE2E_ClusterCacheEvictionPreservesOwnership verifies cache eviction
// does not release CRDT ownership.
func TestE2E_ClusterCacheEvictionPreservesOwnership(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	node := startClusterNode(t, ctx)
	bagID, _, _, _ := uploadBag(t, ctx, 16*1024, "evict")

	storage.WaitForBagIndexed(t, node.env.Persister, bagID, 3*time.Minute)
	require.True(t, node.coordinator.OwnsBag(bagID))

	// Simulate cache eviction callback.
	node.env.Server.DHTRegistrar().Deregister(bagID)
	_ = node.env.Server.OverlayManager().Leave(bagID)

	require.True(t, node.coordinator.OwnsBag(bagID), "ownership must survive eviction")
	require.Equal(t, 1, node.coordinator.OwnedCount())
}

// --- helpers ---

func waitForBagIndexedOnAnyNode(t *testing.T, nodes []*clusterNode, bagID [32]byte, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		for _, n := range nodes {
			_, found, _ := n.env.Persister.LookupBag(bagID)
			if found {
				return
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("bag %s not indexed on any node within %s", hex.EncodeToString(bagID[:8]), timeout)
}

func findOwner(nodes []*clusterNode, bagID [32]byte) *clusterNode {
	for _, n := range nodes {
		if n.coordinator.OwnsBag(bagID) {
			return n
		}
	}
	return nil
}

func verifyPayload(t *testing.T, torrent *tonstorage.Torrent, payload []byte) {
	t.Helper()
	require.NotNil(t, torrent.Header, "header should be resolved")

	nameEnd := torrent.Header.NameIndex[0]
	fileName := string(torrent.Header.Names[:nameEnd])
	downloadedPath := filepath.Join(torrent.Path, string(torrent.Header.DirName), fileName)
	got, err := os.ReadFile(downloadedPath)
	require.NoError(t, err)
	require.True(t, bytes.Equal(got, payload),
		"payload mismatch: got %d bytes, want %d bytes", len(got), len(payload))
}
