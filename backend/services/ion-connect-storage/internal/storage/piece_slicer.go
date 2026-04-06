package storage

import (
	"fmt"
	"math"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

const maxSafePieceIndex = math.MaxUint64 / uint64(boc.PieceSize)

// slicePieceData extracts piece data from headerBytes and/or segmentData.
// Handles three cases: header-only, payload-only, or spanning the boundary.
// Always returns an explicit copy (never a sub-slice of segmentData).
func slicePieceData(headerBytes, segmentData []byte, pieceIndex int, pieceSize uint32, fileSize, headerSize uint64) ([]byte, error) {
	if pieceIndex < 0 || uint64(pieceIndex) > maxSafePieceIndex {
		return nil, fmt.Errorf("piece index %d out of safe range", pieceIndex)
	}
	pieceStart := uint64(pieceIndex) * uint64(pieceSize)
	pieceEnd := min(pieceStart+uint64(pieceSize), fileSize)
	if pieceStart >= fileSize {
		return nil, fmt.Errorf("piece %d starts beyond fileSize %d", pieceIndex, fileSize)
	}

	if pieceEnd <= headerSize {
		return copySlice(headerBytes[pieceStart:pieceEnd]), nil
	}
	if pieceStart >= headerSize {
		return sliceFromPayload(segmentData, pieceStart, pieceEnd, headerSize)
	}
	return sliceBoundaryPiece(headerBytes, segmentData, pieceStart, pieceEnd, headerSize)
}

// sliceFromPayload extracts data from a segment buffer for a payload-only piece.
func sliceFromPayload(segmentData []byte, pieceStart, pieceEnd, headerSize uint64) ([]byte, error) {
	payloadStart := pieceStart - headerSize
	segOffset := payloadStart % boc.SegmentSize
	length := pieceEnd - pieceStart
	if uint64(len(segmentData)) < segOffset+length {
		return nil, fmt.Errorf("segment too short: need %d, have %d", segOffset+length, len(segmentData))
	}
	return copySlice(segmentData[segOffset : segOffset+length]), nil
}

// sliceBoundaryPiece assembles a piece that spans the header/payload boundary.
func sliceBoundaryPiece(headerBytes, segmentData []byte, pieceStart, pieceEnd, headerSize uint64) ([]byte, error) {
	headerTail := headerBytes[pieceStart:]
	payloadNeeded := pieceEnd - headerSize
	if uint64(len(segmentData)) < payloadNeeded {
		return nil, fmt.Errorf("segment too short for boundary piece")
	}
	result := make([]byte, pieceEnd-pieceStart)
	copy(result, headerTail)
	copy(result[len(headerTail):], segmentData[:payloadNeeded])
	return result, nil
}

// payloadSegmentIndex computes which Greenfield segment contains the payload data
// for the given piece. Returns -1 if the piece is entirely within the header.
func payloadSegmentIndex(pieceIndex int, headerSize uint64, pieceSize uint32) int {
	if pieceIndex < 0 || uint64(pieceIndex) > maxSafePieceIndex {
		return -1
	}
	pieceStart := uint64(pieceIndex) * uint64(pieceSize)
	if pieceStart+uint64(pieceSize) <= headerSize {
		return -1
	}
	payloadOffset := max(pieceStart, headerSize) - headerSize
	return int(payloadOffset / boc.SegmentSize)
}

// copySlice makes an explicit copy to avoid pinning large backing arrays.
func copySlice(src []byte) []byte {
	dst := make([]byte, len(src))
	copy(dst, src)
	return dst
}
