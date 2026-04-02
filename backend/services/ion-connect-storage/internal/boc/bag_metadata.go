package boc

import (
	"encoding/binary"
	"fmt"
	"log/slog"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

// BagMetadata holds parsed .ionstorage BoC fields.
type BagMetadata struct {
	BagID          [32]byte
	PieceSize      uint32
	FileSize       uint64
	HeaderSize     uint64
	HeaderHash     [32]byte
	RootHash       [32]byte
	PieceCount     int
	MerkleTreeRoot *cell.Cell
	Header         *TorrentHeader
	RawBoC         []byte
}

// ParseIonStorageBoC parses the .ionstorage format into BagMetadata.
// Format: [4 bytes LE: BoC length][TorrentInfo BoC][torrent header bytes]
func ParseIonStorageBoC(data []byte, logger *slog.Logger) (*BagMetadata, error) {
	if len(data) < 4 {
		return nil, fmt.Errorf("ionstorage too short: %d bytes", len(data))
	}

	bocLen := binary.LittleEndian.Uint32(data[:4])
	if uint32(len(data)) < 4+bocLen {
		return nil, fmt.Errorf("ionstorage truncated: need %d, have %d", 4+bocLen, len(data))
	}

	bocBytes := data[4 : 4+bocLen]
	headerBytes := data[4+bocLen:]

	meta, err := parseTorrentInfoBoC(bocBytes, data, logger)
	if err != nil {
		return nil, err
	}

	if len(headerBytes) > 0 {
		header, err := ParseTorrentHeader(headerBytes)
		if err != nil {
			return nil, fmt.Errorf("parse embedded header: %w", err)
		}
		meta.Header = header
	}

	return meta, nil
}

// BuildIonStorageBytes serializes BagMetadata into .ionstorage format.
// Format: [4 bytes LE: BoC length][TorrentInfo BoC][torrent header bytes]
func BuildIonStorageBytes(torrentInfoBoC []byte, headerBytes []byte) []byte {
	bocLen := uint32(len(torrentInfoBoC))
	result := make([]byte, 4+len(torrentInfoBoC)+len(headerBytes))
	binary.LittleEndian.PutUint32(result[:4], bocLen)
	copy(result[4:], torrentInfoBoC)
	copy(result[4+len(torrentInfoBoC):], headerBytes)
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
	pieceCount := int((fileSize + uint64(ps) - 1) / uint64(ps))

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
