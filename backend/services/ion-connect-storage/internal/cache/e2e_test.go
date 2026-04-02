//go:build e2e

package cache_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/stretchr/testify/require"
)

const payloadSize = 17 * 1024 * 1024

func TestE2E_PerFileCacheRoundTrip(t *testing.T) {
	privKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}

	ctx := context.Background()
	logger := greenfield.E2ELogger()

	bucketName := fmt.Sprintf("e2e-cache-%d", time.Now().UnixMilli())
	objectName := fmt.Sprintf("payload-%d", time.Now().UnixMilli())

	payload := generateRandomPayload(t, payloadSize)
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, boc.SingleFileHeader(objectName, uint64(len(payload))))
	t.Logf("bag ID: %s", hex.EncodeToString(bagID[:]))

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)
	require.NotNil(t, meta.Header)
	greenfield.UploadToGreenfield(t, ctx, privKey, bucketName, objectName, payload, ionStorageData, bagID)

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	defer db.Close()

	gfClient := greenfield.CreateE2EClient(t, privKey)
	defer gfClient.Close()

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)

	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: bucketName, ObjectName: objectName}},
	}, 1))
	require.NoError(t, metadataStore.PutBagMetadata(bagID, ionStorageData))

	cacheDir := t.TempDir()
	segmentCache := cache.NewSegmentCache(cacheDir, time.Hour, nil, logger)

	layout := cache.BagFileLayout{
		Files:     meta.Header.Files,
		TotalSize: uint64(payloadSize), // raw file data only, no header
	}
	require.NoError(t, segmentCache.OpenBag(bagID, layout))

	// Segment 0: fetch with TeeReader to cache
	wc0, err := segmentCache.SegmentWriter(bagID, 0)
	require.NoError(t, err)
	seg0, err := fetcher.FetchSegment(ctx, bucketName, objectName, 0, wc0)
	require.NoError(t, err)
	require.NoError(t, wc0.Close())
	segmentCache.MarkSegmentWritten(bagID, 0)
	require.Equal(t, payload[:boc.SegmentSize], seg0)

	cached0, ok, err := segmentCache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, seg0, cached0)

	bagDir := filepath.Join(cacheDir, hex.EncodeToString(bagID[:]))
	_, err = os.Stat(filepath.Join(bagDir, objectName))
	require.NoError(t, err, "cached file should exist on disk")

	// Segment 1: fetch, cache, verify persistence
	wc1, err := segmentCache.SegmentWriter(bagID, 1)
	require.NoError(t, err)
	seg1, err := fetcher.FetchSegment(ctx, bucketName, objectName, 1, wc1)
	require.NoError(t, err)
	require.NoError(t, wc1.Close())
	segmentCache.MarkSegmentWritten(bagID, 1)
	require.Equal(t, payload[boc.SegmentSize:], seg1)

	cached1, ok, err := segmentCache.GetSegment(bagID, 1)
	require.NoError(t, err)
	require.True(t, ok, "segment 1 should be cached")
	require.Equal(t, seg1, cached1)

	// Verify MetadataStore persistence: fetch-on-cache-hit returns same metadata
	storedMeta, err := metadataStore.GetBagMetadata(ctx, bagID)
	require.NoError(t, err)
	require.Equal(t, bagID, storedMeta.BagID)
	require.Equal(t, meta.FileSize, storedMeta.FileSize)
	require.Equal(t, meta.PieceSize, storedMeta.PieceSize)
	require.NotNil(t, storedMeta.Header)
	require.Equal(t, meta.Header.Files[0].Name, storedMeta.Header.Files[0].Name)
}

func generateRandomPayload(t *testing.T, size int) []byte {
	t.Helper()
	buf := make([]byte, size)
	_, err := rand.Read(buf)
	require.NoError(t, err)
	return buf
}
