package boc

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestParseIonStorageBoC(t *testing.T) {
	payload := make([]byte, 1024*1024) // 1MB
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	header := SingleFileHeader("data", uint64(len(payload)))
	bagID, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, header)

	meta, err := ParseIonStorageBoC(rawData, testLogger())
	require.NoError(t, err)

	require.Equal(t, bagID, meta.BagID)
	require.Equal(t, uint32(PieceSize), meta.PieceSize)
	// FileSize = headerSize + payloadSize (v2 hashes over header+payload)
	require.Equal(t, meta.HeaderSize+uint64(len(payload)), meta.FileSize)
	require.NotNil(t, meta.Header)
	require.Len(t, meta.Header.Files, 1)
	require.Equal(t, "data", meta.Header.Files[0].Name)
	require.NotNil(t, meta.MerkleTree, "v2 must populate MerkleTree")
}

func TestParseIonStorageBoCTooShort(t *testing.T) {
	_, err := ParseIonStorageBoC([]byte{0x02, 1}, testLogger())
	require.Error(t, err)
	require.Contains(t, err.Error(), "too short")
}

func TestParseIonStorageBoCBadVersion(t *testing.T) {
	_, err := ParseIonStorageBoC([]byte{0x01, 0, 0, 0, 0}, testLogger())
	require.Error(t, err)
	require.Contains(t, err.Error(), "unsupported ionstorage version")
}

func TestBagIDDeterministic(t *testing.T) {
	payload := []byte("hello world")
	id1, _ := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))
	id2, _ := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))
	require.Equal(t, id1, id2)
}

func TestBuildIonStorageBoCRoundTrip(t *testing.T) {
	payload := make([]byte, 17*1024*1024) // 17MB
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	header := SingleFileHeader("data", uint64(len(payload)))
	bagID, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, header)

	meta, err := ParseIonStorageBoC(rawData, testLogger())
	require.NoError(t, err)
	require.Equal(t, bagID, meta.BagID)
	// FileSize = headerSize + payloadSize
	require.Equal(t, meta.HeaderSize+uint64(len(payload)), meta.FileSize)
	require.NotNil(t, meta.MerkleTree)
	require.NotNil(t, meta.Header)

	// PieceCount based on full size (header + payload)
	expectedPieces := int((meta.FileSize + uint64(PieceSize) - 1) / uint64(PieceSize))
	require.Equal(t, expectedPieces, meta.PieceCount)
}

func TestParseTorrentInfoZeroPieceSize(t *testing.T) {
	// Build a valid .ionstorage, then corrupt piece_size to 0.
	payload := make([]byte, 1024)
	header := SingleFileHeader("data", uint64(len(payload)))
	_, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, header)

	// The BoC starts: [0x02][4 bytes LE: boc len][boc bytes]...
	// We need to find the piece_size field inside the TorrentInfo cell BoC
	// and zero it out. Since the BoC is a serialized Cell, we can't easily
	// patch it without breaking the hash. Instead, test via parseTorrentInfoCell
	// by building a cell with pieceSize=0 directly.
	cell, err := BuildTorrentInfoCell(0, 1024, [32]byte{}, [32]byte{}, 100)
	require.NoError(t, err)

	_, err = parseTorrentInfoCell(cell, rawData, testLogger())
	require.Error(t, err)
	require.Contains(t, err.Error(), "piece_size is zero")
}

func TestParseTorrentInfoRejectsOverflowPieceCount(t *testing.T) {
	// fileSize near uint64 max with small pieceSize should be rejected.
	cell, err := BuildTorrentInfoCell(1, ^uint64(0), [32]byte{}, [32]byte{}, 0)
	require.NoError(t, err)
	_, err = parseTorrentInfoCell(cell, nil, testLogger())
	require.ErrorContains(t, err, "exceeds maximum")
}

func TestParseRejectsTrailingDataWithZeroHeaderSize(t *testing.T) {
	// Build a valid .ionstorage, then rebuild the TorrentInfo cell with
	// HeaderSize=0 while keeping the trailing header bytes. The parser
	// must reject this as "unexpected trailing data."
	payload := make([]byte, 1024)
	header := SingleFileHeader("data", uint64(len(payload)))
	_, validData := MustBuildIonStorageBoC(t, payload, PieceSize, header)

	// Parse valid data to get the original metadata fields.
	validMeta, err := ParseIonStorageBoC(validData, testLogger())
	require.NoError(t, err)

	// Rebuild TorrentInfo cell with HeaderSize=0.
	zeroHdrCell, err := BuildTorrentInfoCell(
		validMeta.PieceSize, validMeta.FileSize,
		validMeta.RootHash, validMeta.HeaderHash, 0, // HeaderSize=0
	)
	require.NoError(t, err)

	// Reconstruct .ionstorage: version + new TorrentInfo BoC + original merkle tree BoC + original header bytes.
	newInfoBoC := zeroHdrCell.ToBOC()
	merkleBoC := validMeta.MerkleTree.ToBOC()
	headerBytes, err := SerializeTorrentHeader(header)
	require.NoError(t, err)

	crafted := BuildIonStorageBytes(newInfoBoC, merkleBoC, headerBytes)

	_, err = ParseIonStorageBoC(crafted, testLogger())
	require.Error(t, err)
	require.Contains(t, err.Error(), "unexpected trailing data")
}

func TestMerkleTreeRoundTrip(t *testing.T) {
	payload := make([]byte, 2*1024*1024) // 2MB
	for i := range payload {
		payload[i] = byte(i)
	}

	_, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))

	meta, err := ParseIonStorageBoC(rawData, testLogger())
	require.NoError(t, err)
	require.NotNil(t, meta.MerkleTree)
	require.Equal(t, meta.RootHash, [32]byte(meta.MerkleTree.Hash()))
}
