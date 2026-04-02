package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"

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
	start := int64(segmentIndex) * boc.SegmentSize
	end := start + boc.SegmentSize - 1
	rangeStr := fmt.Sprintf("bytes=%d-%d", start, end)

	reader, _, err := client.GetObject(ctx, bucket, object, greenfieldclient.GetObjectOpts{
		Range: rangeStr,
	})
	if err != nil {
		return nil, fmt.Errorf("get segment %d of %s/%s: %w", segmentIndex, bucket, object, err)
	}

	var src io.Reader = reader
	if w != nil {
		src = io.TeeReader(reader, w)
	}

	data, err := io.ReadAll(src)
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
