package boc

const (
	// SegmentSize is the BNB Greenfield segment size (16 MB).
	SegmentSize = 16 * 1024 * 1024

	// PieceSize is the ION piece size (512 KB).
	PieceSize = 512 * 1024

	// PiecesPerSegment is the number of ION pieces per Greenfield segment.
	PiecesPerSegment = SegmentSize / PieceSize // 32

	// maxPieceCount is the safety limit for piece count (~4.7 TB at 512 KB pieces).
	maxPieceCount = 10_000_000
)
