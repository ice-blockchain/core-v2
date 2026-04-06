package storage

import (
	"testing"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func TestSlicePieceDataHeaderOnly(t *testing.T) {
	header := []byte("header-data-that-is-pretty-long-enough")
	piece, err := slicePieceData(header, nil, 0, 10, uint64(len(header)), uint64(len(header)))
	require.NoError(t, err)
	require.Equal(t, header[:10], piece)
}

func TestSlicePieceDataPayloadOnly(t *testing.T) {
	header := []byte("hdr")
	segment := make([]byte, 100)
	for i := range segment {
		segment[i] = byte(i)
	}
	headerSize := uint64(len(header))
	fileSize := headerSize + uint64(len(segment))

	// Piece 1: starts at byte 10, entirely in payload
	piece, err := slicePieceData(header, segment, 1, 10, fileSize, headerSize)
	require.NoError(t, err)
	// payload offset = 10 - 3 = 7, segment offset = 7
	require.Equal(t, segment[7:17], piece)
}

func TestSlicePieceDataBoundary(t *testing.T) {
	header := []byte("hdr") // 3 bytes
	segment := make([]byte, 100)
	for i := range segment {
		segment[i] = byte(i + 10)
	}
	headerSize := uint64(3)
	fileSize := headerSize + uint64(len(segment))

	// Piece 0 with size 10: bytes [0,10) spans header [0,3) + payload [0,7)
	piece, err := slicePieceData(header, segment, 0, 10, fileSize, headerSize)
	require.NoError(t, err)
	require.Equal(t, 10, len(piece))
	require.Equal(t, header, piece[:3])
	require.Equal(t, segment[:7], piece[3:])
}

func TestSlicePieceDataLastPieceTruncated(t *testing.T) {
	header := []byte("h")
	segment := []byte("payload")
	fileSize := uint64(1 + 7) // header + payload = 8
	// pieceSize=10, piece 0: [0, 8) truncated at fileSize
	piece, err := slicePieceData(header, segment, 0, 10, fileSize, 1)
	require.NoError(t, err)
	require.Equal(t, 8, len(piece))
}

func TestSlicePieceDataExplicitCopy(t *testing.T) {
	header := []byte("header")
	segment := make([]byte, 100)
	piece, err := slicePieceData(header, segment, 1, 10, 106, 6)
	require.NoError(t, err)

	// Modify segment; piece should be unaffected (explicit copy)
	segment[4] = 0xff
	require.NotEqual(t, byte(0xff), piece[0])
}

func TestSlicePieceDataOutOfRange(t *testing.T) {
	_, err := slicePieceData(nil, nil, 100, 10, 50, 5)
	require.Error(t, err)
}

func TestSlicePieceDataRejectsNegativeIndex(t *testing.T) {
	_, err := slicePieceData(nil, nil, -1, boc.PieceSize, 1000, 100)
	require.Error(t, err)
	require.Contains(t, err.Error(), "safe range")
}

func TestSlicePieceDataRejectsOverflowIndex(t *testing.T) {
	// An index that would overflow when multiplied by PieceSize
	hugeIndex := int(maxSafePieceIndex) + 1
	_, err := slicePieceData(nil, nil, hugeIndex, boc.PieceSize, 1000, 100)
	require.Error(t, err)
	require.Contains(t, err.Error(), "safe range")
}

func TestPayloadSegmentIndexRejectsNegative(t *testing.T) {
	require.Equal(t, -1, payloadSegmentIndex(-1, 100, boc.PieceSize))
}

func TestPayloadSegmentIndexRejectsOverflow(t *testing.T) {
	hugeIndex := int(maxSafePieceIndex) + 1
	require.Equal(t, -1, payloadSegmentIndex(hugeIndex, 100, boc.PieceSize))
}

func TestPayloadSegmentIndex(t *testing.T) {
	require.Equal(t, -1, payloadSegmentIndex(0, 600000, boc.PieceSize)) // piece fully in header
	require.Equal(t, 0, payloadSegmentIndex(0, 100, boc.PieceSize))     // piece spans header
	require.Equal(t, 0, payloadSegmentIndex(1, 100, boc.PieceSize))     // second piece, payload offset < 16MB
}

func TestBuildFullBitfield(t *testing.T) {
	bf := buildFullBitfield(8)
	require.Equal(t, 1, len(bf))
	require.Equal(t, byte(0xff), bf[0])

	bf = buildFullBitfield(3)
	require.Equal(t, 1, len(bf))
	require.Equal(t, byte(0x07), bf[0])

	bf = buildFullBitfield(9)
	require.Equal(t, 2, len(bf))
	require.Equal(t, byte(0xff), bf[0])
	require.Equal(t, byte(0x01), bf[1])
}

func TestBuildFullBitfieldRejectsInvalid(t *testing.T) {
	require.Nil(t, buildFullBitfield(0))
	require.Nil(t, buildFullBitfield(-1))
	require.Nil(t, buildFullBitfield(maxPieceCount+1))
}

func TestBuildFullBitfieldAcceptsMaximum(t *testing.T) {
	// Just verify it doesn't panic at the boundary.
	bf := buildFullBitfield(maxPieceCount)
	require.NotNil(t, bf)
	require.Equal(t, (maxPieceCount+7)/8, len(bf))
}
