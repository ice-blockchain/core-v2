package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"math"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// fetchSegment downloads a single 16 MB segment using a Range request.
// If w is non-nil, the stream is tee'd to w during reading (for simultaneous caching).
// The reader is closed immediately after reading to free the HTTP connection.
func fetchSegment(
	ctx context.Context,
	client greenfieldclient.Client,
	bucket, object string,
	segmentIndex int,
	w io.Writer,
	logger *slog.Logger,
) ([]byte, error) {
	if segmentIndex < 0 || int64(segmentIndex) > math.MaxInt64/boc.SegmentSize {
		return nil, fmt.Errorf("invalid segment index: %d", segmentIndex)
	}
	start := int64(segmentIndex) * boc.SegmentSize
	end := start + boc.SegmentSize - 1
	rangeStr := fmt.Sprintf("bytes=%d-%d", start, end)

	reader, _, err := client.GetObject(ctx, bucket, object, greenfieldclient.GetObjectOpts{
		Range: rangeStr,
	})
	if err != nil {
		return nil, fmt.Errorf("get segment %d of %s/%s: %w", segmentIndex, bucket, object, err)
	}

	const maxSegmentRead = boc.SegmentSize + 1024 // 16 MB + small buffer
	var src io.Reader = io.LimitReader(reader, int64(maxSegmentRead))
	if w != nil {
		src = io.TeeReader(src, w)
	}

	data, err := io.ReadAll(src)
	reader.Close()
	if err != nil {
		return nil, fmt.Errorf("read segment %d of %s/%s: %w", segmentIndex, bucket, object, err)
	}
	if len(data) > boc.SegmentSize {
		return nil, fmt.Errorf("segment %d of %s/%s exceeds max size", segmentIndex, bucket, object)
	}

	logger.Debug("fetched segment",
		"bucket", bucket,
		"object", object,
		"segment", segmentIndex,
		"bytes", len(data),
	)

	return data, nil
}
