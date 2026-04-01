package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
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
	RawBoC         []byte
}

// metadataObjectName returns the .ionstorage companion object name.
func metadataObjectName(objectName string) string {
	return objectName + ".ionstorage"
}

// fetchMetadata downloads and parses a .ionstorage BoC from Greenfield.
func fetchMetadata(
	ctx context.Context,
	client greenfieldclient.Client,
	bucket, object string,
	logger *slog.Logger,
) (*BagMetadata, error) {
	metaName := metadataObjectName(object)

	reader, _, err := client.GetObject(ctx, bucket, metaName, greenfieldclient.GetObjectOpts{})
	if err != nil {
		return nil, fmt.Errorf("get metadata %s/%s: %w", bucket, metaName, err)
	}

	data, err := io.ReadAll(reader)
	reader.Close()
	if err != nil {
		return nil, fmt.Errorf("read metadata %s/%s: %w", bucket, metaName, err)
	}

	return parseIonStorageBoC(data, logger)
}

// parseIonStorageBoC parses raw .ionstorage BoC bytes into BagMetadata.
func parseIonStorageBoC(data []byte, logger *slog.Logger) (*BagMetadata, error) {
	cells, err := cell.FromBOC(data)
	if err != nil {
		return nil, fmt.Errorf("parse BoC: %w", err)
	}

	return parseTorrentInfoCell(cells, data, logger)
}

// parseTorrentInfoCell extracts TorrentInfo fields from the root cell.
func parseTorrentInfoCell(
	root *cell.Cell,
	rawBoC []byte,
	logger *slog.Logger,
) (*BagMetadata, error) {
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
	fs := fileSize
	pieceCount := int((fs + uint64(ps) - 1) / uint64(ps))

	var bagID [32]byte
	copy(bagID[:], root.Hash())

	logger.Debug("parsed .ionstorage metadata",
		"piece_size", ps,
		"file_size", fs,
		"piece_count", pieceCount,
	)

	return &BagMetadata{
		BagID:      bagID,
		PieceSize:  ps,
		FileSize:   fs,
		HeaderSize: headerSize,
		HeaderHash: headerHash,
		RootHash:   rootHash,
		PieceCount: pieceCount,
		RawBoC:     rawBoC,
	}, nil
}
