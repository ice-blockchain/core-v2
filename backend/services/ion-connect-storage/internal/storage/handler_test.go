package storage_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/storage"
	"github.com/stretchr/testify/require"
	tonoverlay "github.com/xssnick/tonutils-go/adnl/overlay"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestHandlerGetTorrentInfo(t *testing.T) {
	h, bagID, _ := createHandlerWithPayload(t, 1024*1024)
	ctx := context.Background()

	resp, err := h.HandleOverlayQuery(ctx, bagID, appendUint32LE(nil, 0x91c4962a))
	require.NoError(t, err)
	require.NotEmpty(t, resp)
	// Response starts with TorrentInfoContainer constructor ID
	respID := binary.LittleEndian.Uint32(resp[:4])
	require.Equal(t, uint32(0x14ced0ee), respID)
}

func TestHandlerAddUpdate(t *testing.T) {
	h, bagID, _ := createHandlerWithPayload(t, 1024*1024)
	ctx := context.Background()

	resp, err := h.HandleOverlayQuery(ctx, bagID, buildTestAddUpdateRequest())
	require.NoError(t, err)
	require.NotEmpty(t, resp)
	// Response is storage.ok
	respID := binary.LittleEndian.Uint32(resp[:4])
	require.Equal(t, uint32(0xc32b1c05), respID)
}

func TestHandlerGetPieceAndReassemble(t *testing.T) {
	payload := make([]byte, 2*1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}
	h, bagID, meta := createHandlerWithSpecificPayload(t, payload)
	ctx := context.Background()

	var assembled []byte
	for i := range meta.PieceCount {
		req := buildTestGetPieceRequest(int32(i))
		resp, err := h.HandleOverlayQuery(ctx, bagID, req)
		require.NoError(t, err, "piece %d", i)
		_, pieceData := parseTestPieceResponse(t, resp)
		assembled = append(assembled, pieceData...)
	}

	// Assembled = header + payload. Strip header.
	require.Equal(t, int(meta.FileSize), len(assembled))
	extractedPayload := assembled[meta.HeaderSize:]
	require.Equal(t, sha256.Sum256(payload), sha256.Sum256(extractedPayload))
}

func TestHandlerPing(t *testing.T) {
	h, bagID, _ := createHandlerWithPayload(t, 1024)
	ctx := context.Background()

	req := appendUint32LE(nil, 0x44f3f211) // tlPing
	req = append(req, make([]byte, 8)...)  // session_id = 0
	resp, err := h.HandleOverlayQuery(ctx, bagID, req)
	require.NoError(t, err)
	respID := binary.LittleEndian.Uint32(resp[:4])
	require.Equal(t, uint32(0x6cf5c6a5), respID) // tlPong
}

func TestHandlerUnknownConstructor(t *testing.T) {
	h, bagID, _ := createHandlerWithPayload(t, 1024)
	ctx := context.Background()

	req := appendUint32LE(nil, 0xdeadbeef)
	_, err := h.HandleOverlayQuery(ctx, bagID, req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unknown TL constructor")
}

func TestHandlerRejectsNegativePieceID(t *testing.T) {
	h, bagID, _ := createHandlerWithPayload(t, 1024)
	ctx := context.Background()

	req := buildTestGetPieceRequest(-1)
	_, err := h.HandleOverlayQuery(ctx, bagID, req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid piece ID")
}

func TestHandlerRejectsForwardedPieceWithTamperedProof(t *testing.T) {
	payload := make([]byte, 1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}
	logger := testLogger()
	header := boc.SingleFileHeader("data", uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(nil, logger)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	cacheDir := t.TempDir()
	segmentCache := cache.NewSegmentCache(cacheDir, time.Hour, nil, logger)

	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: "test", ObjectName: "data"}},
	}, 1))
	require.NoError(t, metadataStore.PutBagMetadata(bagID, ionStorageData))

	headerBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)
	layout := cache.BagFileLayout{
		Files:     meta.Header.Files,
		TotalSize: uint64(len(payload)),
	}
	require.NoError(t, segmentCache.OpenBag(bagID, layout))
	populateSegmentCache(t, segmentCache, bagID, payload, headerBytes)

	// Generate a valid proof for piece 0, then tamper with it.
	validProof, err := boc.GenerateMerkleProof(meta.MerkleTree, 0, meta.PieceCount)
	require.NoError(t, err)

	tamperedProof := make([]byte, len(validProof))
	copy(tamperedProof, validProof)
	// Flip a byte in the middle to corrupt the proof
	if len(tamperedProof) > 10 {
		tamperedProof[10] ^= 0xFF
	}

	// Build a forwarder that returns tampered proof
	tamperedForwarder := &mockTamperedForwarder{
		data:  []byte("fake-piece-data"),
		proof: tamperedProof,
	}

	_, priv, _ := ed25519.GenerateKey(rand.Reader)
	nodeBuilder := func(overlayID []byte) (*tonoverlay.Node, error) {
		return tonoverlay.NewNode(overlayID, priv)
	}

	// OwnershipChecker that says we do NOT own the bag (forces forwarding path)
	nonOwner := &mockNonOwner{}

	h := storage.NewHandler(storage.HandlerConfig{
		MetadataStore:      metadataStore,
		SegmentCache:       segmentCache,
		Fetcher:            fetcher,
		Index:              persister,
		OwnershipChecker:   nonOwner,
		PieceForwarder:     tamperedForwarder,
		OverlayNodeBuilder: nodeBuilder,
		Logger:             logger,
	})

	req := buildTestGetPieceRequest(0)
	_, err = h.HandleOverlayQuery(context.Background(), bagID, req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "proof invalid")
}

type mockTamperedForwarder struct {
	data  []byte
	proof []byte
}

func (m *mockTamperedForwarder) ForwardGetPiece(_ context.Context, _ [32]byte, _ int) ([]byte, []byte, error) {
	return m.data, m.proof, nil
}

func (m *mockTamperedForwarder) ForwardRawQuery(_ context.Context, _ [32]byte, _ []byte) ([]byte, error) {
	return nil, nil
}

type mockNonOwner struct{}

func (m *mockNonOwner) OwnsBag(_ [32]byte) bool { return false }

// createHandlerWithPayload builds a handler with in-memory metadata (no Greenfield).
// The fetcher is nil-client so getPiece will use segment cache directly.
func createHandlerWithPayload(t *testing.T, payloadSize int) (*storage.Handler, [32]byte, *boc.BagMetadata) {
	t.Helper()
	payload := make([]byte, payloadSize)
	for i := range payload {
		payload[i] = byte(i % 256)
	}
	return createHandlerWithSpecificPayload(t, payload)
}

func createHandlerWithSpecificPayload(t *testing.T, payload []byte) (*storage.Handler, [32]byte, *boc.BagMetadata) {
	t.Helper()
	logger := testLogger()
	header := boc.SingleFileHeader("data", uint64(len(payload)))
	bagID, ionStorageData := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, header)

	meta, err := boc.ParseIonStorageBoC(ionStorageData, logger)
	require.NoError(t, err)

	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })

	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(nil, logger)
	metadataStore := cache.NewMetadataStore(db, fetcher, persister, logger)
	cacheDir := t.TempDir()
	segmentCache := cache.NewSegmentCache(cacheDir, time.Hour, nil, logger)

	require.NoError(t, persister.PersistBagsAndHeight([]index.BagEntry{
		{BagID: bagID, Location: index.BagLocation{BucketName: "test", ObjectName: "data"}},
	}, 1))
	require.NoError(t, metadataStore.PutBagMetadata(bagID, ionStorageData))

	// Pre-populate segment cache with payload data
	headerBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)
	layout := cache.BagFileLayout{
		Files:     meta.Header.Files,
		TotalSize: uint64(len(payload)),
	}
	require.NoError(t, segmentCache.OpenBag(bagID, layout))
	populateSegmentCache(t, segmentCache, bagID, payload, headerBytes)

	_, priv, _ := ed25519.GenerateKey(rand.Reader)
	nodeBuilder := func(overlayID []byte) (*tonoverlay.Node, error) {
		return tonoverlay.NewNode(overlayID, priv)
	}

	singleNode := cluster.NewSingleNodeCoordinator("test-node", [32]byte{}, "127.0.0.1", 0)
	h := storage.NewHandler(storage.HandlerConfig{
		MetadataStore:      metadataStore,
		SegmentCache:       segmentCache,
		Fetcher:            fetcher,
		Index:              persister,
		OwnershipChecker:   singleNode,
		PieceForwarder:     singleNode,
		OverlayNodeBuilder: nodeBuilder,
		Logger:             logger,
	})
	return h, bagID, meta
}

// populateSegmentCache writes payload data into segment cache.
// Note: the handler expects segment data to be raw Greenfield payload (no header).
func populateSegmentCache(t *testing.T, sc *cache.SegmentCache, bagID [32]byte, payload, headerBytes []byte) {
	t.Helper()
	for segIdx := 0; segIdx*boc.SegmentSize < len(payload); segIdx++ {
		start := segIdx * boc.SegmentSize
		end := min(start+boc.SegmentSize, len(payload))
		wc, err := sc.SegmentWriter(bagID, segIdx)
		require.NoError(t, err)
		_, err = wc.Write(payload[start:end])
		require.NoError(t, err)
		require.NoError(t, wc.Close())
		sc.MarkSegmentWritten(bagID, segIdx)
	}
	_ = headerBytes
}

// TL helpers
func appendUint32LE(buf []byte, v uint32) []byte {
	b := [4]byte{}
	binary.LittleEndian.PutUint32(b[:], v)
	return append(buf, b[:]...)
}

func buildTestGetPieceRequest(pieceID int32) []byte {
	buf := appendUint32LE(nil, 0x807ae660)
	return appendUint32LE(buf, uint32(pieceID))
}

func buildTestAddUpdateRequest() []byte {
	buf := appendUint32LE(nil, 0x4d3135d2)
	buf = append(buf, make([]byte, 8)...)
	buf = appendUint32LE(buf, 0)
	buf = appendUint32LE(buf, 0xce33e0b6)
	buf = appendTestTLBytes(buf, []byte{})
	buf = appendUint32LE(buf, 0)
	buf = appendUint32LE(buf, 0x3313708a)
	buf = appendUint32LE(buf, 0xbc799737)
	buf = appendUint32LE(buf, 0x997275b5)
	return buf
}

func appendTestTLBytes(buf, data []byte) []byte {
	buf = append(buf, byte(len(data)))
	buf = append(buf, data...)
	padding := (4 - (len(data)+1)%4) % 4
	for range padding {
		buf = append(buf, 0)
	}
	return buf
}

func parseTestPieceResponse(t *testing.T, data []byte) (proof, pieceData []byte) {
	t.Helper()
	require.True(t, len(data) >= 4)
	data = data[4:]
	proof, data = readTestTLBytes(t, data)
	pieceData, _ = readTestTLBytes(t, data)
	return proof, pieceData
}

func readTestTLBytes(t *testing.T, data []byte) ([]byte, []byte) {
	t.Helper()
	require.True(t, len(data) >= 1)
	if data[0] < 254 {
		length := int(data[0])
		data = data[1:]
		require.True(t, len(data) >= length)
		result := data[:length]
		totalRead := 1 + length
		padding := (4 - totalRead%4) % 4
		return result, data[length+padding:]
	}
	require.True(t, len(data) >= 4)
	length := int(data[1]) | int(data[2])<<8 | int(data[3])<<16
	data = data[4:]
	require.True(t, len(data) >= length)
	result := data[:length]
	padding := (4 - length%4) % 4
	return result, data[length+padding:]
}

func extractBitfieldFromUpdateInit(t *testing.T, data []byte) []byte {
	t.Helper()
	require.True(t, len(data) >= 4)
	data = data[4:] // skip constructor ID
	bitfield, _ := readTestTLBytes(t, data)
	return bitfield
}
