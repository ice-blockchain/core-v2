package boc

const (
	// SegmentSize is the BNB Greenfield segment size (16 MB).
	SegmentSize = 16 * 1024 * 1024

	// PieceSize is the ION piece size (512 KB).
	PieceSize = 512 * 1024

	// PiecesPerSegment is the number of ION pieces per Greenfield segment.
	PiecesPerSegment = SegmentSize / PieceSize // 32
)
