package boc

import (
	"crypto/sha256"
	"fmt"
	"testing"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

// MustBuildIonStorageBoC is a test helper that calls BuildIonStorageBoC and fails on error.
func MustBuildIonStorageBoC(t *testing.T, payload []byte, pieceSize uint32, header *TorrentHeader) ([32]byte, []byte) {
	t.Helper()
	bagID, data, err := BuildIonStorageBoC(payload, pieceSize, header)
	if err != nil {
		t.Fatalf("BuildIonStorageBoC: %v", err)
	}
	return bagID, data
}

// SingleFileHeader returns a TorrentHeader for a single file with the given name and size.
func SingleFileHeader(name string, dataSize uint64) *TorrentHeader {
	return &TorrentHeader{Files: []FileEntry{{Name: name, Size: dataSize}}}
}

// MustBuildHeaderCell is a test helper that calls BuildHeaderCell and fails on error.
func MustBuildHeaderCell(t *testing.T, header *TorrentHeader) *cell.Cell {
	t.Helper()
	c, err := BuildHeaderCell(header)
	if err != nil {
		t.Fatalf("BuildHeaderCell: %v", err)
	}
	return c
}

// MustBuildTorrentInfoCell is a test helper that calls BuildTorrentInfoCell and fails on error.
func MustBuildTorrentInfoCell(t *testing.T, pieceSize uint32, fileSize uint64, rootHash, headerHash [32]byte, headerSize uint64) *cell.Cell {
	t.Helper()
	c, err := BuildTorrentInfoCell(pieceSize, fileSize, rootHash, headerHash, headerSize)
	if err != nil {
		t.Fatalf("BuildTorrentInfoCell: %v", err)
	}
	return c
}

// BuildIonStorageBoC constructs a complete .ionstorage v2 blob from payload and torrent header.
// Pieces are hashed over headerBytes + payload (matching tonutils-storage).
// FileSize = len(headerBytes) + len(payload).
// Greenfield stores only the raw payload; header is embedded in .ionstorage.
func BuildIonStorageBoC(payload []byte, pieceSize uint32, header *TorrentHeader) ([32]byte, []byte, error) {
	headerBytes, err := SerializeTorrentHeader(header)
	if err != nil {
		return [32]byte{}, nil, fmt.Errorf("serialize header: %w", err)
	}

	fullData := append(headerBytes, payload...)
	pieceHashes := ComputePieceHashes(fullData, pieceSize)
	merkleRoot := BuildMerkleTree(pieceHashes)

	var rootHash [32]byte
	copy(rootHash[:], merkleRoot.Hash())

	headerHash := sha256.Sum256(headerBytes)
	fullSize := uint64(len(headerBytes)) + uint64(len(payload))

	torrentInfoCell, err := BuildTorrentInfoCell(
		pieceSize, fullSize,
		rootHash, headerHash, uint64(len(headerBytes)),
	)
	if err != nil {
		return [32]byte{}, nil, err
	}

	var bagID [32]byte
	copy(bagID[:], torrentInfoCell.Hash())

	torrentInfoBoC := torrentInfoCell.ToBOC()
	merkleTreeBoC := merkleRoot.ToBOC()
	ionStorage := BuildIonStorageBytes(torrentInfoBoC, merkleTreeBoC, headerBytes)
	return bagID, ionStorage, nil
}

// BuildTorrentInfoCell creates a standard TorrentInfo TVM cell.
// Layout: pieceSize(32) | fileSize(64) | rootHash(256) | headerSize(64) | headerHash(256) | description(8)
// Description is stored INLINE (not as reference) matching tlb "." tag behavior.
// Empty description = single 0x00 byte (8 bits) inline.
func BuildTorrentInfoCell(
	pieceSize uint32, fileSize uint64,
	rootHash, headerHash [32]byte,
	headerSize uint64,
) (*cell.Cell, error) {
	c := cell.BeginCell().
		MustStoreUInt(uint64(pieceSize), 32).
		MustStoreUInt(fileSize, 64).
		MustStoreSlice(rootHash[:], 256).
		MustStoreUInt(headerSize, 64).
		MustStoreSlice(headerHash[:], 256).
		MustStoreUInt(0, 8). // empty description inline (matches tlb.Text{Value:""}.ToCell())
		EndCell()
	return c, nil
}

// BuildHeaderCell creates a TVM cell containing serialized torrent header bytes.
func BuildHeaderCell(header *TorrentHeader) (*cell.Cell, error) {
	headerBytes, err := SerializeTorrentHeader(header)
	if err != nil {
		return nil, err
	}
	return cell.BeginCell().MustStoreSlice(headerBytes, uint(len(headerBytes)*8)).EndCell(), nil
}
