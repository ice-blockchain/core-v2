package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"time"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"golang.org/x/sync/singleflight"
)

const fetchTimeout = 2 * time.Minute

// Fetcher downloads metadata and segments from Greenfield with request coalescing.
type Fetcher struct {
	client greenfieldclient.Client
	flight singleflight.Group
	logger *slog.Logger
}

// NewFetcher creates a Fetcher.
func NewFetcher(client greenfieldclient.Client, logger *slog.Logger) *Fetcher {
	return &Fetcher{
		client: client,
		logger: logger,
	}
}

// FetchMetadata downloads and parses the .ionstorage BoC for the given object.
// Concurrent calls for the same object share a single Greenfield request.
func (f *Fetcher) FetchMetadata(ctx context.Context, bucket, object string) (*boc.BagMetadata, error) {
	key := fmt.Sprintf("%s/%s.meta", bucket, object)
	val, err, _ := f.do(key, func() (interface{}, error) {
		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), fetchTimeout)
		defer cancel()
		return fetchMetadata(fetchCtx, f.client, bucket, object, f.logger)
	})
	if err != nil {
		return nil, err
	}
	return val.(*boc.BagMetadata), nil
}

// FetchSegment downloads a 16 MB segment by index.
// If w is non-nil, the stream is tee'd to w during reading (for simultaneous caching).
// Concurrent calls for the same segment share a single Greenfield request via singleflight.
// When coalesced, only the first caller's w receives the tee data.
func (f *Fetcher) FetchSegment(ctx context.Context, bucket, object string, segmentIndex int, w io.Writer) ([]byte, error) {
	key := fmt.Sprintf("%s/%s:seg:%d", bucket, object, segmentIndex)
	val, err, _ := f.do(key, func() (interface{}, error) {
		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), fetchTimeout)
		defer cancel()
		return fetchSegment(fetchCtx, f.client, bucket, object, segmentIndex, w, f.logger)
	})
	if err != nil {
		return nil, err
	}
	return val.([]byte), nil
}

func (f *Fetcher) do(key string, fn func() (interface{}, error)) (interface{}, error, bool) {
	return f.flight.Do(key, fn)
}
