package cache

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/cockroachdb/pebble/v2"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
)

const metadataKeyPrefix = "meta/"

// MetadataStore persists bag metadata (raw .ionstorage BoC) in PebbleDB.
// On cache miss, fetches from Greenfield via the bag index and caches the result.
type MetadataStore struct {
	db      *pebble.DB
	fetcher *greenfield.Fetcher
	index   *index.Persister
	logger  *slog.Logger
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
func (s *MetadataStore) PutBagMetadata(bagID [32]byte, rawBoC []byte) error {
	return s.db.Set(makeMetadataKey(bagID), rawBoC, pebble.Sync)
}

// GetBagMetadata retrieves and parses bag metadata.
// Checks PebbleDB first. On miss, looks up the bag location in the index,
// fetches .ionstorage from Greenfield, caches it, and returns the parsed result.
func (s *MetadataStore) GetBagMetadata(ctx context.Context, bagID [32]byte) (*boc.BagMetadata, error) {
	rawBoC, found, err := s.loadFromDB(bagID)
	if err != nil {
		return nil, err
	}
	if found {
		return boc.ParseIonStorageBoC(rawBoC, s.logger)
	}

	return s.fetchAndCache(ctx, bagID)
}

// DeleteBagMetadata removes cached metadata for a bag.
func (s *MetadataStore) DeleteBagMetadata(bagID [32]byte) error {
	return s.db.Delete(makeMetadataKey(bagID), pebble.Sync)
}

// HasBagMetadata checks if metadata exists in the cache.
func (s *MetadataStore) HasBagMetadata(bagID [32]byte) (bool, error) {
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

func (s *MetadataStore) loadFromDB(bagID [32]byte) ([]byte, bool, error) {
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

func (s *MetadataStore) fetchAndCache(ctx context.Context, bagID [32]byte) (*boc.BagMetadata, error) {
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

	if err := s.PutBagMetadata(bagID, meta.RawBoC); err != nil {
		s.logger.Warn("failed to cache metadata", "bag_id", fmt.Sprintf("%x", bagID), "error", err)
	}

	return meta, nil
}

func makeMetadataKey(bagID [32]byte) []byte {
	key := make([]byte, len(metadataKeyPrefix)+32)
	copy(key, metadataKeyPrefix)
	copy(key[len(metadataKeyPrefix):], bagID[:])
	return key
}
