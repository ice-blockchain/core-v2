package boc

import (
	"encoding/binary"
	"fmt"
	"log/slog"
	"math"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

const ionStorageVersion = 0x02

// BagMetadata holds parsed .ionstorage BoC fields.
type BagMetadata struct {
	BagID       [32]byte
	PieceSize   uint32
	FileSize    uint64
	HeaderSize  uint64
	HeaderHash  [32]byte
	RootHash    [32]byte
	PieceCount  int
	MerkleTree  *cell.Cell
	Header      *TorrentHeader
	HeaderBytes []byte // pre-serialized TL-boxed header for piece serving
	RawBoC      []byte
}

// ParseIonStorageBoC parses the .ionstorage v2 format into BagMetadata.
// Format: [1 byte: 0x02][4 bytes LE: TorrentInfo BoC len][TorrentInfo BoC]
//
//	[4 bytes LE: merkle tree BoC len][merkle tree BoC][torrent header bytes]
func ParseIonStorageBoC(data []byte, logger *slog.Logger) (*BagMetadata, error) {
	if len(data) < 5 {
		return nil, fmt.Errorf("ionstorage too short: %d bytes", len(data))
	}
	if data[0] != ionStorageVersion {
		return nil, fmt.Errorf("unsupported ionstorage version: 0x%02x", data[0])
	}

	offset := 1
	meta, bocEnd, err := parseTorrentInfoSection(data, offset, logger)
	if err != nil {
		return nil, err
	}
	meta.RawBoC = data
	offset = bocEnd

	merkleTree, treeEnd, err := parseMerkleTreeSection(data, offset)
	if err != nil {
		return nil, err
	}
	meta.MerkleTree = merkleTree
	offset = treeEnd

	if offset < len(data) {
		header, err := ParseTorrentHeader(data[offset:])
		if err != nil {
			return nil, fmt.Errorf("parse embedded header: %w", err)
		}
		meta.Header = header
		hdrBytes, err := SerializeTorrentHeader(header)
		if err != nil {
			return nil, fmt.Errorf("pre-serialize header: %w", err)
		}
		meta.HeaderBytes = hdrBytes
	}

	return meta, nil
}

func parseTorrentInfoSection(data []byte, offset int, logger *slog.Logger) (*BagMetadata, int, error) {
	if offset+4 > len(data) {
		return nil, 0, fmt.Errorf("ionstorage truncated at torrent info length")
	}
	bocLen := int(binary.LittleEndian.Uint32(data[offset : offset+4]))
	offset += 4
	if offset+bocLen > len(data) {
		return nil, 0, fmt.Errorf("ionstorage truncated: need %d, have %d", offset+bocLen, len(data))
	}
	meta, err := parseTorrentInfoBoC(data[offset:offset+bocLen], data, logger)
	if err != nil {
		return nil, 0, err
	}
	return meta, offset + bocLen, nil
}

func parseMerkleTreeSection(data []byte, offset int) (*cell.Cell, int, error) {
	if offset+4 > len(data) {
		return nil, 0, fmt.Errorf("ionstorage truncated at merkle tree length")
	}
	treeLen := int(binary.LittleEndian.Uint32(data[offset : offset+4]))
	offset += 4
	if offset+treeLen > len(data) {
		return nil, 0, fmt.Errorf("ionstorage truncated at merkle tree data")
	}
	root, err := cell.FromBOC(data[offset : offset+treeLen])
	if err != nil {
		return nil, 0, fmt.Errorf("parse merkle tree BoC: %w", err)
	}
	return root, offset + treeLen, nil
}

// BuildIonStorageBytes serializes into .ionstorage v2 format.
// Format: [1 byte: 0x02][4 bytes LE: TorrentInfo BoC len][TorrentInfo BoC]
//
//	[4 bytes LE: merkle tree BoC len][merkle tree BoC][torrent header bytes]
func BuildIonStorageBytes(torrentInfoBoC, merkleTreeBoC, headerBytes []byte) []byte {
	if len(torrentInfoBoC) > math.MaxUint32 || len(merkleTreeBoC) > math.MaxUint32 {
		return nil
	}
	totalLen := 1 + 4 + len(torrentInfoBoC) + 4 + len(merkleTreeBoC) + len(headerBytes)
	result := make([]byte, totalLen)
	result[0] = ionStorageVersion
	off := 1
	binary.LittleEndian.PutUint32(result[off:], uint32(len(torrentInfoBoC)))
	off += 4
	copy(result[off:], torrentInfoBoC)
	off += len(torrentInfoBoC)
	binary.LittleEndian.PutUint32(result[off:], uint32(len(merkleTreeBoC)))
	off += 4
	copy(result[off:], merkleTreeBoC)
	off += len(merkleTreeBoC)
	copy(result[off:], headerBytes)
	return result
}

func parseTorrentInfoBoC(bocBytes, rawData []byte, logger *slog.Logger) (*BagMetadata, error) {
	root, err := cell.FromBOC(bocBytes)
	if err != nil {
		return nil, fmt.Errorf("parse BoC: %w", err)
	}
	return parseTorrentInfoCell(root, rawData, logger)
}

func parseTorrentInfoCell(root *cell.Cell, rawBoC []byte, logger *slog.Logger) (*BagMetadata, error) {
	slice := root.BeginParse()

	pieceSize, err := slice.LoadUInt(32)
	if err != nil {
		return nil, fmt.Errorf("read piece_size: %w", err)
	}

	fileSize, err := slice.LoadUInt(64)
	if err != nil {
		return nil, fmt.Errorf("read file_size: %w", err)
	}

	rootHashBytes, err := slice.LoadSlice(256)
	if err != nil {
		return nil, fmt.Errorf("read root_hash: %w", err)
	}

	headerSize, err := slice.LoadUInt(64)
	if err != nil {
		return nil, fmt.Errorf("read header_size: %w", err)
	}

	headerHashBytes, err := slice.LoadSlice(256)
	if err != nil {
		return nil, fmt.Errorf("read header_hash: %w", err)
	}

	var rootHash, headerHash [32]byte
	copy(rootHash[:], rootHashBytes)
	copy(headerHash[:], headerHashBytes)

	ps := uint32(pieceSize)
	if ps == 0 {
		return nil, fmt.Errorf("piece_size is zero")
	}
	pieceCount := int((fileSize + uint64(ps) - 1) / uint64(ps))
	if pieceCount > maxPieceCount {
		return nil, fmt.Errorf("piece count %d exceeds maximum %d", pieceCount, maxPieceCount)
	}

	var bagID [32]byte
	copy(bagID[:], root.Hash())

	logger.Debug("parsed .ionstorage metadata",
		"piece_size", ps,
		"file_size", fileSize,
		"piece_count", pieceCount,
	)

	return &BagMetadata{
		BagID:      bagID,
		PieceSize:  ps,
		FileSize:   fileSize,
		HeaderSize: headerSize,
		HeaderHash: headerHash,
		RootHash:   rootHash,
		PieceCount: pieceCount,
		RawBoC:     rawBoC,
	}, nil
}
