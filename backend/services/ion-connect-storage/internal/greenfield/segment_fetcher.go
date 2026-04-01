package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
)

const (
	// SegmentSize is the BNB Greenfield segment size (16 MB).
	SegmentSize = 16 * 1024 * 1024

	// PieceSize is the ION piece size (512 KB).
	PieceSize = 512 * 1024

	// PiecesPerSegment is the number of ION pieces per Greenfield segment.
	PiecesPerSegment = SegmentSize / PieceSize // 32
)

// fetchSegment downloads a single 16 MB segment using a Range request.
// The reader is closed immediately after reading to free the HTTP connection.
func fetchSegment(
	ctx context.Context,
	client greenfieldclient.Client,
	bucket, object string,
	segmentIndex int,
	logger *slog.Logger,
) ([]byte, error) {
	start := int64(segmentIndex) * SegmentSize
	end := start + SegmentSize - 1
	rangeStr := fmt.Sprintf("bytes=%d-%d", start, end)

	reader, _, err := client.GetObject(ctx, bucket, object, greenfieldclient.GetObjectOpts{
		Range: rangeStr,
	})
	if err != nil {
		return nil, fmt.Errorf("get segment %d of %s/%s: %w", segmentIndex, bucket, object, err)
	}

	data, err := io.ReadAll(reader)
	reader.Close()
	if err != nil {
		return nil, fmt.Errorf("read segment %d of %s/%s: %w", segmentIndex, bucket, object, err)
	}

	logger.Debug("fetched segment",
		"bucket", bucket,
		"object", object,
		"segment", segmentIndex,
		"bytes", len(data),
	)

	return data, nil
}
