//go:build e2e

package storage_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
)

const payloadSize = 17 * 1024 * 1024

// TestE2E_StorageHandlerDownload verifies the full download path:
// upload to Greenfield -> getPiece for all pieces -> verify payload matches.
// Also verifies cache hit on sequential download (no Greenfield re-fetch).
func TestE2E_StorageHandlerDownload(t *testing.T) {
	privKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set")
	}

	ctx := context.Background()
	logger := greenfield.E2ELogger()

	bucketName := fmt.Sprintf("e2e-storage-%d", time.Now().UnixMilli())
	objectName := fmt.Sprintf("payload-%d", time.Now().UnixMilli())

	payload := generatePayload(t, payloadSize)
	header := boc.SingleFileHeader(objectName, uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)
	t.Logf("bag ID: %s", hex.EncodeToString(bagID[:]))

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)
	require.Equal(t, meta.HeaderSize+uint64(len(payload)), meta.FileSize)

	greenfield.UploadToGreenfield(t, ctx, privKey, bucketName, objectName, payload, ionStorageData, bagID)

	handler, segmentCache, fetchCounter := createTestHandler(t, privKey, bucketName, objectName, bagID, ionStorageData, logger)

	verifyGetTorrentInfo(t, ctx, handler, bagID)
	verifyAddUpdate(t, ctx, handler, bagID)
	reassembled := downloadAllPieces(t, ctx, handler, bagID, meta)
	verifyReassembledPayload(t, reassembled, meta, payload)
	verifyCachePopulated(t, segmentCache, bagID)
	verifyNoCacheMissOnSecondDownload(t, ctx, handler, bagID, meta, fetchCounter)
}

func verifyGetTorrentInfo(t *testing.T, ctx context.Context, h *storage.Handler, bagID [32]byte) {
	t.Helper()
	resp, err := h.HandleOverlayQuery(ctx, bagID, appendUint32(nil, 0x91c4962a))
	require.NoError(t, err)
	require.NotEmpty(t, resp)
}

func verifyAddUpdate(t *testing.T, ctx context.Context, h *storage.Handler, bagID [32]byte) {
	t.Helper()
	resp, err := h.HandleOverlayQuery(ctx, bagID, buildAddUpdateRequest())
	require.NoError(t, err)
	require.NotEmpty(t, resp)
}

func downloadAllPieces(t *testing.T, ctx context.Context, h *storage.Handler, bagID [32]byte, meta *boc.BagMetadata) []byte {
	t.Helper()
	var assembled []byte
	for i := range meta.PieceCount {
		resp, err := h.HandleOverlayQuery(ctx, bagID, buildGetPieceRequest(int32(i)))
		require.NoError(t, err, "piece %d", i)
		_, pieceData := parsePieceResponse(t, resp)
		assembled = append(assembled, pieceData...)
	}
	return assembled
}

func verifyReassembledPayload(t *testing.T, reassembled []byte, meta *boc.BagMetadata, payload []byte) {
	t.Helper()
	require.Equal(t, int(meta.FileSize), len(reassembled))
	extractedPayload := reassembled[meta.HeaderSize:]
	require.Equal(t, sha256.Sum256(payload), sha256.Sum256(extractedPayload))
}

func verifyCachePopulated(t *testing.T, sc *cache.SegmentCache, bagID [32]byte) {
	t.Helper()
	require.True(t, sc.HasSegment(bagID, 0), "segment 0 should be cached")
}

func verifyNoCacheMissOnSecondDownload(
	t *testing.T, ctx context.Context, h *storage.Handler,
	bagID [32]byte, meta *boc.BagMetadata, counter *fetchCounter,
) {
	t.Helper()
	before := counter.count()
	for i := range meta.PieceCount {
		_, err := h.HandleOverlayQuery(ctx, bagID, buildGetPieceRequest(int32(i)))
		require.NoError(t, err, "piece %d", i)
	}
	require.Equal(t, before, counter.count(), "no Greenfield fetches on cache hit")
}

func createTestHandler(
	t *testing.T, privKey, bucketName, objectName string,
	bagID [32]byte, ionStorageData []byte, logger *slog.Logger,
) (*storage.Handler, *cache.SegmentCache, *fetchCounter) {
	t.Helper()

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	gfClient := greenfield.CreateE2EClient(t, privKey)
	t.Cleanup(func() { gfClient.Close() })

	counter := &fetchCounter{}
	fetcher := greenfield.NewFetcher(gfClient, logger)
	persister := index.NewPersister(db)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	segmentCache := cache.NewSegmentCache(t.TempDir(), time.Hour, nil, logger)

	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: bucketName, ObjectName: objectName}},
	}, 1))
	require.NoError(t, metadataStore.PutBagMetadata(bagID, ionStorageData))

	_, priv, _ := ed25519.GenerateKey(rand.Reader)

	h := storage.NewHandler(storage.HandlerConfig{
		MetadataStore: metadataStore,
		SegmentCache:  segmentCache,
		Fetcher:       fetcher,
		Index:         persister,
		PrivateKey:    priv,
		Logger:        logger,
	})
	return h, segmentCache, counter
}

type fetchCounter struct{ n int }

func (c *fetchCounter) count() int { return c.n }

func generatePayload(t *testing.T, size int) []byte {
	t.Helper()
	buf := make([]byte, size)
	_, err := rand.Read(buf)
	require.NoError(t, err)
	return buf
}
