//go:build e2e

package storage_test

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
	tonstorage "github.com/xssnick/tonutils-storage/storage"
)

// TestE2E_DownloadViaTonutils uploads data to Greenfield, waits for the
// subscriber to index the bag, then downloads via tonutils-storage over ADNL/RLDP.
func TestE2E_DownloadViaTonutils(t *testing.T) {
	privKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}

	ctx := context.Background()
	logger := storage.E2ELogger()
	payload := storage.GenerateE2EPayload(64*1024 + 137)

	bucketName := fmt.Sprintf("e2e-storage-%d", time.Now().UnixMilli())
	objectName := fmt.Sprintf("payload-%d", time.Now().UnixMilli())

	header := boc.SingleFileHeader(objectName, uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)
	t.Logf("bag ID: %s", hex.EncodeToString(bagID[:]))

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)

	// Start node with subscriber running.
	singleNode := cluster.NewSingleNodeCoordinator("test-node", [32]byte{}, "127.0.0.1", 0)
	env := storage.SetupSeederServer(t, privKey, singleNode, logger)

	// Upload to Greenfield -- subscriber picks it up via websocket.
	greenfield.UploadToGreenfield(t, ctx, privKey, bucketName, objectName, payload, ionStorageData, bagID)

	// Wait for subscriber to index the bag.
	storage.WaitForBagIndexed(t, env.Persister, bagID, 2*time.Minute)

	// Download via tonutils-storage client.
	downTorrent, downSrv := storage.SetupDownloader(t, bagID, env.Server.DHTClient())
	storage.ConnectDownloaderToNode(t, downTorrent, downSrv, env.Server)
	storage.WaitForDownloadComplete(t, downTorrent, 60*time.Second)

	verifyDownloadedContent(t, downTorrent, payload)
	verifySegmentCache(t, env, bagID, objectName, payload)
	verifyMetadataStore(t, ctx, env, bagID, meta)

	downTorrent.Stop()
	downTorrent.Wait()
	downSrv.Stop()
}

func verifyDownloadedContent(t *testing.T, torrent *tonstorage.Torrent, payload []byte) {
	t.Helper()
	require.NotNil(t, torrent.Header, "header should be resolved")
	require.NotNil(t, torrent.Info, "info should be resolved")

	nameEnd := torrent.Header.NameIndex[0]
	fileName := string(torrent.Header.Names[:nameEnd])
	downloadedPath := filepath.Join(torrent.Path, string(torrent.Header.DirName), fileName)
	got, err := os.ReadFile(downloadedPath)
	require.NoError(t, err)
	require.True(t, bytes.Equal(got, payload), "payload mismatch: got %d bytes, want %d", len(got), len(payload))
}

func verifySegmentCache(t *testing.T, env *storage.SeederEnv, bagID [32]byte, objectName string, payload []byte) {
	t.Helper()

	segmentCount := (len(payload) + boc.SegmentSize - 1) / boc.SegmentSize
	for i := range segmentCount {
		require.True(t, env.SegmentCache.HasSegment(bagID, i), "segment %d should be cached", i)

		data, ok, err := env.SegmentCache.GetSegment(bagID, i)
		require.NoError(t, err)
		require.True(t, ok, "segment %d should be readable", i)

		start := i * boc.SegmentSize
		end := min(start+boc.SegmentSize, len(payload))
		require.Equal(t, payload[start:end], data, "segment %d data mismatch", i)
	}

	bagDir := filepath.Join(env.CacheDir, hex.EncodeToString(bagID[:]))
	info, err := os.Stat(filepath.Join(bagDir, objectName))
	require.NoError(t, err, "cached file should exist on disk")
	require.Equal(t, int64(len(payload)), info.Size(), "cached file size mismatch")
}

func verifyMetadataStore(t *testing.T, ctx context.Context, env *storage.SeederEnv, bagID [32]byte, meta *boc.BagMetadata) {
	t.Helper()

	hasMeta, err := env.MetadataStore.HasBagMetadata(bagID)
	require.NoError(t, err)
	require.True(t, hasMeta, "metadata should exist in store")

	storedMeta, err := env.MetadataStore.GetBagMetadata(ctx, bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, storedMeta.BagID)
	require.Equal(t, meta.FileSize, storedMeta.FileSize)
	require.Equal(t, meta.PieceSize, storedMeta.PieceSize)
	require.Equal(t, meta.PieceCount, storedMeta.PieceCount)
	require.Equal(t, meta.RootHash, storedMeta.RootHash)
	require.Equal(t, meta.HeaderHash, storedMeta.HeaderHash)
	require.NotNil(t, storedMeta.Header)
	require.NotNil(t, storedMeta.MerkleTree, "merkle tree should be persisted")
	require.Equal(t, meta.MerkleTree.Hash(), storedMeta.MerkleTree.Hash(), "merkle tree root hash mismatch")

	loc, found, err := env.Persister.LookupBag(bagID)
	require.NoError(t, err)
	require.True(t, found, "bag should be in index")
	require.NotEmpty(t, loc.BucketName)
	require.NotEmpty(t, loc.ObjectName)
}
