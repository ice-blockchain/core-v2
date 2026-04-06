package boc

const (
	// SegmentSize is the BNB Greenfield segment size (16 MB).
	SegmentSize = 16 * 1024 * 1024

	// PieceSize is the ION piece size (128 KB), the default TON Storage piece size.
	PieceSize = 128 * 1024

	// PiecesPerSegment is the number of ION pieces per Greenfield segment.
	PiecesPerSegment = SegmentSize / PieceSize // 128

	// maxPieceCount is the safety limit for piece count (~1.2 TB at 128 KB pieces).
	maxPieceCount = 10_000_000
)
