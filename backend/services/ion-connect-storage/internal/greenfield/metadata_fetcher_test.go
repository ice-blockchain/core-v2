package greenfield

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/xssnick/tonutils-go/tvm/cell"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestMetadataObjectNaming(t *testing.T) {
	require.Equal(t, "myfile.dat.ionstorage", metadataObjectName("myfile.dat"))
	require.Equal(t, "photo.jpg.ionstorage", metadataObjectName("photo.jpg"))
}

func TestParseTorrentInfoCell(t *testing.T) {
	// Build a TorrentInfo cell with known values
	var rootHash, headerHash [32]byte
	for i := range rootHash {
		rootHash[i] = byte(i)
	}
	for i := range headerHash {
		headerHash[i] = byte(i + 100)
	}

	descCell := cell.BeginCell().MustStoreStringSnake("test-description").EndCell()
	torrentInfoCell := cell.BeginCell().
		MustStoreUInt(524288, 32).   // piece_size = 512KB
		MustStoreUInt(17825792, 64). // file_size = 17MB
		MustStoreSlice(rootHash[:], 256).
		MustStoreUInt(128, 64). // header_size
		MustStoreSlice(headerHash[:], 256).
		MustStoreRef(descCell).
		EndCell()

	boc := torrentInfoCell.ToBOC()

	meta, err := parseIonStorageBoC(boc, testLogger())
	require.NoError(t, err)

	require.Equal(t, uint32(524288), meta.PieceSize)
	require.Equal(t, uint64(17825792), meta.FileSize)
	require.Equal(t, rootHash, meta.RootHash)
	require.Equal(t, uint64(128), meta.HeaderSize)
	require.Equal(t, headerHash, meta.HeaderHash)
	require.Equal(t, 34, meta.PieceCount) // ceil(17825792 / 524288) = 34
	var expectedBagID [32]byte
	copy(expectedBagID[:], torrentInfoCell.Hash())
	require.Equal(t, expectedBagID, meta.BagID)
	require.Equal(t, boc, meta.RawBoC)
}

func TestBagIDComputation(t *testing.T) {
	// Two identical cells must produce the same bag ID
	descCell := cell.BeginCell().MustStoreStringSnake("").EndCell()
	c1 := cell.BeginCell().
		MustStoreUInt(524288, 32).
		MustStoreUInt(1000, 64).
		MustStoreSlice(make([]byte, 32), 256).
		MustStoreUInt(0, 64).
		MustStoreSlice(make([]byte, 32), 256).
		MustStoreRef(descCell).
		EndCell()

	descCell2 := cell.BeginCell().MustStoreStringSnake("").EndCell()
	c2 := cell.BeginCell().
		MustStoreUInt(524288, 32).
		MustStoreUInt(1000, 64).
		MustStoreSlice(make([]byte, 32), 256).
		MustStoreUInt(0, 64).
		MustStoreSlice(make([]byte, 32), 256).
		MustStoreRef(descCell2).
		EndCell()

	require.Equal(t, c1.Hash(), c2.Hash())
}
