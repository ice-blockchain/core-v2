package greenfield

import (
	"context"
	"fmt"
	"log/slog"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"golang.org/x/sync/singleflight"
)

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
func (f *Fetcher) FetchMetadata(ctx context.Context, bucket, object string) (*BagMetadata, error) {
	key := fmt.Sprintf("%s/%s.meta", bucket, object)
	val, err, _ := f.do(key, func() (interface{}, error) {
		return fetchMetadata(ctx, f.client, bucket, object, f.logger)
	})
	if err != nil {
		return nil, err
	}
	return val.(*BagMetadata), nil
}

// FetchSegment downloads a 16 MB segment by index.
// Concurrent calls for the same segment share a single Greenfield request.
// Callers must not mutate the returned slice.
func (f *Fetcher) FetchSegment(ctx context.Context, bucket, object string, segmentIndex int) ([]byte, error) {
	key := fmt.Sprintf("%s/%s:seg:%d", bucket, object, segmentIndex)
	val, err, _ := f.do(key, func() (interface{}, error) {
		return fetchSegment(ctx, f.client, bucket, object, segmentIndex, f.logger)
	})
	if err != nil {
		return nil, err
	}
	return val.([]byte), nil
}

func (f *Fetcher) do(key string, fn func() (interface{}, error)) (interface{}, error, bool) {
	return f.flight.Do(key, fn)
}
