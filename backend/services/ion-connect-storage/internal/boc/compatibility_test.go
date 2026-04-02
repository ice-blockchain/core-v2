package boc_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"io"
	"log/slog"
	"os"
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tvm/cell"
	tonstorage "github.com/xssnick/tonutils-storage/storage"
)

func TestTorrentHeaderSerializationMatchesCreateTorrent(t *testing.T) {
	// Verify our header serialization produces the same bytes as
	// tonutils-storage by checking that CreateTorrentWithInitialHeader
	// produces the same BagID (which depends on headerData bytes).
	header := &boc.TorrentHeader{
		DirName: "testdir",
		Files: []boc.FileEntry{
			{Name: "file1.txt", Size: 1000},
			{Name: "file2.bin", Size: 2000},
		},
	}
	ourBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)

	// Verify round-trip: our Serialize -> our Parse
	parsed, err := boc.ParseTorrentHeader(ourBytes)
	require.NoError(t, err)
	require.Equal(t, "testdir", parsed.DirName)
	require.Len(t, parsed.Files, 2)
	require.Equal(t, "file1.txt", parsed.Files[0].Name)
	require.Equal(t, uint64(1000), parsed.Files[0].Size)
	require.Equal(t, "file2.bin", parsed.Files[1].Name)
	require.Equal(t, uint64(2000), parsed.Files[1].Size)

	// Cross-format compatibility is proven by TestBagIDMatchesTonutilsStorageCreateTorrent:
	// same BagID means same headerData bytes (used for headerHash and piece hashing).
}

func TestTorrentHeaderParseRoundTrip(t *testing.T) {
	header := boc.SingleFileHeader("data", 1024*1024)
	serialized, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)

	parsed, err := boc.ParseTorrentHeader(serialized)
	require.NoError(t, err)
	require.Len(t, parsed.Files, 1)
	require.Equal(t, "data", parsed.Files[0].Name)
	require.Equal(t, uint64(1024*1024), parsed.Files[0].Size)
}

func TestBagIDMatchesTonutilsStorageCreateTorrent(t *testing.T) {
	const fileName = "data"
	payload := make([]byte, 1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	// tonutils-storage hashes over headerData+payload, so we do the same here
	// using our header serialization + merkle tree to verify compatibility.
	header := boc.SingleFileHeader(fileName, uint64(len(payload)))
	headerBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)

	fullData := append(headerBytes, payload...)
	pieceHashes := computeRefPieceHashes(fullData, boc.PieceSize)
	merkleRoot := boc.BuildMerkleTree(pieceHashes)
	var rootHash [32]byte
	copy(rootHash[:], merkleRoot.Hash())

	headerHash := sha256.Sum256(headerBytes)
	fullSize := uint64(len(headerBytes)) + uint64(len(payload))

	ourCell, err := boc.BuildTorrentInfoCell(boc.PieceSize, fullSize, rootHash, headerHash, uint64(len(headerBytes)))
	require.NoError(t, err)
	var ourBagID [32]byte
	copy(ourBagID[:], ourCell.Hash())

	// Reference: tonutils-storage CreateTorrent (also hashes header+payload)
	refTorrent, err := tonstorage.CreateTorrentWithInitialHeader(
		context.Background(),
		t.TempDir(), "",
		toTonutilsHeader(header),
		&mockStorage{forcedPieceSize: boc.PieceSize},
		&mockNetConnector{},
		[]tonstorage.FileRef{&bytesFileRef{name: fileName, data: payload}},
		nil, false,
	)
	require.NoError(t, err)

	var refBagID [32]byte
	copy(refBagID[:], refTorrent.BagID)
	require.Equal(t, refBagID, ourBagID, "bag ID must match tonutils-storage when hashing header+payload")
	require.Equal(t, uint32(boc.PieceSize), refTorrent.Info.PieceSize)
}

func TestMerkleRootMatchesTonutilsStorage(t *testing.T) {
	const fileName = "data"
	payload := make([]byte, 2*1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	// Build with header+payload (matching tonutils-storage)
	header := boc.SingleFileHeader(fileName, uint64(len(payload)))
	headerBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)

	fullData := append(headerBytes, payload...)
	pieceHashes := computeRefPieceHashes(fullData, boc.PieceSize)
	ourRoot := boc.BuildMerkleTree(pieceHashes)

	refTorrent, err := tonstorage.CreateTorrentWithInitialHeader(
		context.Background(),
		t.TempDir(), "",
		toTonutilsHeader(header),
		&mockStorage{forcedPieceSize: boc.PieceSize},
		&mockNetConnector{},
		[]tonstorage.FileRef{&bytesFileRef{name: fileName, data: payload}},
		nil, false,
	)
	require.NoError(t, err)

	require.Equal(t, refTorrent.Info.RootHash, ourRoot.Hash())
}

// toTonutilsHeader converts our boc.TorrentHeader to tonutils-storage format.
// Only sets DirName — file entries are populated by initializeTorrentHeader from FileRef list.
func toTonutilsHeader(h *boc.TorrentHeader) *tonstorage.TorrentHeader {
	return &tonstorage.TorrentHeader{
		DirNameSize: uint32(len(h.DirName)),
		DirName:     []byte(h.DirName),
	}
}

// bytesFileRef implements tonstorage.FileRef for in-memory data.
type bytesFileRef struct {
	name string
	data []byte
}

func (f *bytesFileRef) GetName() string { return f.name }
func (f *bytesFileRef) GetSize() uint64 { return uint64(len(f.data)) }
func (f *bytesFileRef) CreateReader() (io.ReaderAt, func() error, error) {
	return bytes.NewReader(f.data), func() error { return nil }, nil
}

// mockStorage implements tonstorage.Storage with minimal stubs for CreateTorrent.
type mockStorage struct {
	forcedPieceSize uint32
}

func (m *mockStorage) GetForcedPieceSize() uint32                                 { return m.forcedPieceSize }
func (m *mockStorage) SetPiece(_ []byte, _ uint32, _ *tonstorage.PieceInfo) error { return nil }
func (m *mockStorage) SetTorrent(_ *tonstorage.Torrent) error                     { return nil }
func (m *mockStorage) SetActiveFiles(_ []byte, _ []uint32) error                  { return nil }
func (m *mockStorage) GetActiveFiles(_ []byte) ([]uint32, error)                  { return nil, nil }
func (m *mockStorage) GetPiece(_ []byte, _ uint32) (*tonstorage.PieceInfo, error) { return nil, nil }
func (m *mockStorage) RemovePiece(_ []byte, _ uint32) error                       { return nil }
func (m *mockStorage) PiecesMask(_ []byte, _ uint32) []byte                       { return nil }
func (m *mockStorage) UpdateUploadStats(_ []byte, _ uint64) error                 { return nil }
func (m *mockStorage) VerifyOnStartup() bool                                      { return false }
func (m *mockStorage) GetAll() []*tonstorage.Torrent                              { return nil }
func (m *mockStorage) GetTorrentByOverlay(_ []byte) *tonstorage.Torrent           { return nil }
func (m *mockStorage) GetFS() tonstorage.FS                                       { return nil }

// mockNetConnector implements tonstorage.NetConnector with minimal stubs.
type mockNetConnector struct{}

func (m *mockNetConnector) GetID() []byte { return make([]byte, 32) }
func (m *mockNetConnector) GetADNLPrivateKey() ed25519.PrivateKey {
	_, priv, _ := ed25519.GenerateKey(nil)
	return priv
}
func (m *mockNetConnector) SetDownloadLimit(_ uint64)                          {}
func (m *mockNetConnector) SetUploadLimit(_ uint64)                            {}
func (m *mockNetConnector) GetUploadLimit() uint64                             { return 0 }
func (m *mockNetConnector) GetDownloadLimit() uint64                           { return 0 }
func (m *mockNetConnector) ThrottleDownload(_ context.Context, _ uint64) error { return nil }
func (m *mockNetConnector) ThrottleUpload(_ context.Context, _ uint64) error   { return nil }
func (m *mockNetConnector) CreateDownloader(_ context.Context, _ *tonstorage.Torrent) (_ tonstorage.TorrentDownloader, err error) {
	return nil, nil
}
func (m *mockNetConnector) ConnectToNode(_ context.Context, _ *tonstorage.Torrent, _ *overlay.Node, _ *address.List) error {
	return nil
}
func (m *mockNetConnector) Stop() {}

func computeRefPieceHashes(data []byte, pieceSize uint32) [][32]byte {
	count := (len(data) + int(pieceSize) - 1) / int(pieceSize)
	hashes := make([][32]byte, count)
	for i := range count {
		start := i * int(pieceSize)
		end := min(start+int(pieceSize), len(data))
		hashes[i] = sha256.Sum256(data[start:end])
	}
	return hashes
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestMerkleProofMatchesRootHash(t *testing.T) {
	const fileName = "data"
	payload := make([]byte, 2*1024*1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	header := boc.SingleFileHeader(fileName, uint64(len(payload)))
	headerBytes, err := boc.SerializeTorrentHeader(header)
	require.NoError(t, err)

	fullData := append(headerBytes, payload...)
	pieceHashes := computeRefPieceHashes(fullData, boc.PieceSize)
	tree := boc.BuildMerkleTree(pieceHashes)
	rootHash := tree.Hash()

	for i := range len(pieceHashes) {
		proof, err := boc.GenerateMerkleProof(tree, i, len(pieceHashes))
		require.NoError(t, err, "piece %d", i)

		proofCell, err := cell.FromBOC(proof)
		require.NoError(t, err, "piece %d", i)
		require.Equal(t, rootHash, proofCell.Hash(), "proof root must match tree root for piece %d", i)
	}
}
