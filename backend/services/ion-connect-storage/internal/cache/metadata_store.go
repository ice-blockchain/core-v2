package cache

import (
	"context"
	"encoding/hex"
	"fmt"
	"log/slog"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"golang.org/x/sync/singleflight"
)

const metadataKeyPrefix = "meta/"

// MetadataStore persists bag metadata (raw .ionstorage BoC) in PebbleDB.
// On cache miss, fetches from Greenfield via the bag index and caches the result.
type MetadataStore struct {
	db      *pebble.DB
	fetcher *greenfield.Fetcher
	index   *index.Persister
	logger  *slog.Logger
	flight  singleflight.Group
}

// NewMetadataStore creates a MetadataStore backed by the given PebbleDB instance.
// The DB is shared with index.Persister (disjoint key prefix meta/ vs idx/).
func NewMetadataStore(
	db *pebble.DB,
	fetcher *greenfield.Fetcher,
	persister *index.Persister,
	logger *slog.Logger,
) *MetadataStore {
	return &MetadataStore{
		db:      db,
		fetcher: fetcher,
		index:   persister,
		logger:  logger,
	}
}

// PutBagMetadata stores raw .ionstorage BoC bytes keyed by bag ID.
func (s *MetadataStore) PutBagMetadata(bagID boc.BagID, rawBoC []byte) error {
	return s.db.Set(makeMetadataKey(bagID), rawBoC, pebble.Sync)
}

// GetBagMetadata retrieves and parses bag metadata.
// Checks PebbleDB first. On miss, looks up the bag location in the index,
// fetches .ionstorage from Greenfield, caches it, and returns the parsed result.
func (s *MetadataStore) GetBagMetadata(ctx context.Context, bagID boc.BagID) (*boc.BagMetadata, error) {
	rawBoC, found, err := s.loadFromDB(bagID)
	if err != nil {
		return nil, err
	}
	if found {
		return boc.ParseIonStorageBoC(rawBoC, s.logger)
	}

	key := hex.EncodeToString(bagID[:])
	// Use WithoutCancel so the first caller's cancellation doesn't poison
	// coalesced requests sharing the same singleflight key.
	bgCtx := context.WithoutCancel(ctx)
	val, err, _ := s.flight.Do(key, func() (interface{}, error) {
		// Re-check DB under singleflight: another caller may have cached it.
		rawBoC, found, err := s.loadFromDB(bagID)
		if err != nil {
			return nil, err
		}
		if found {
			return boc.ParseIonStorageBoC(rawBoC, s.logger)
		}
		return s.fetchAndCache(bgCtx, bagID)
	})
	if err != nil {
		return nil, err
	}
	meta, ok := val.(*boc.BagMetadata)
	if !ok {
		return nil, fmt.Errorf("metadata fetch returned unexpected type %T", val)
	}
	return meta, nil
}

// DeleteBagMetadata removes cached metadata for a bag.
func (s *MetadataStore) DeleteBagMetadata(bagID boc.BagID) error {
	return s.db.Delete(makeMetadataKey(bagID), pebble.Sync)
}

// HasBagMetadata checks if metadata exists in the cache.
func (s *MetadataStore) HasBagMetadata(bagID boc.BagID) (bool, error) {
	_, closer, err := s.db.Get(makeMetadataKey(bagID))
	if err == pebble.ErrNotFound {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check metadata: %w", err)
	}
	closer.Close()
	return true, nil
}

func (s *MetadataStore) loadFromDB(bagID boc.BagID) ([]byte, bool, error) {
	val, closer, err := s.db.Get(makeMetadataKey(bagID))
	if err == pebble.ErrNotFound {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get metadata: %w", err)
	}
	defer closer.Close()
	data := make([]byte, len(val))
	copy(data, val)
	return data, true, nil
}

func (s *MetadataStore) fetchAndCache(ctx context.Context, bagID boc.BagID) (*boc.BagMetadata, error) {
	loc, found, err := s.index.LookupBag(bagID)
	if err != nil {
		return nil, fmt.Errorf("lookup bag for metadata fetch: %w", err)
	}
	if !found {
		return nil, fmt.Errorf("bag not found in index: %x", bagID)
	}

	meta, err := s.fetcher.FetchMetadata(ctx, loc.BucketName, loc.ObjectName)
	if err != nil {
		return nil, fmt.Errorf("fetch metadata from greenfield: %w", err)
	}

	if err := validateBagMetadata(bagID, meta); err != nil {
		return nil, fmt.Errorf("fetched metadata validation failed: %w", err)
	}

	if err := s.PutBagMetadata(bagID, meta.RawBoC); err != nil {
		s.logger.Warn("failed to cache metadata", "bag_id", fmt.Sprintf("%x", bagID), "error", err)
	}

	return meta, nil
}

// validateBagMetadata checks that fetched metadata is consistent before caching.
func validateBagMetadata(expectedBagID boc.BagID, meta *boc.BagMetadata) error {
	if meta.BagID != expectedBagID {
		return fmt.Errorf("bag ID mismatch: expected %x, got %x", expectedBagID, meta.BagID)
	}
	if meta.PieceSize == 0 {
		return fmt.Errorf("piece size is zero")
	}
	if meta.PieceCount <= 0 {
		return fmt.Errorf("piece count %d must be positive", meta.PieceCount)
	}
	if meta.FileSize == 0 {
		return fmt.Errorf("file size is zero")
	}
	if meta.HeaderSize > meta.FileSize {
		return fmt.Errorf("header size %d exceeds file size %d", meta.HeaderSize, meta.FileSize)
	}
	return nil
}

func makeMetadataKey(bagID boc.BagID) []byte {
	key := make([]byte, len(metadataKeyPrefix)+32)
	copy(key, metadataKeyPrefix)
	copy(key[len(metadataKeyPrefix):], bagID[:])
	return key
}
