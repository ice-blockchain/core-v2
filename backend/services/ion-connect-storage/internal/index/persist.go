package index

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/cockroachdb/pebble/v2"
	lru "github.com/hashicorp/golang-lru/v2"
)

const (
	heightKey       = "idx/height"
	bagKeyPrefix    = "idx/bag/"
	maxCachedBagLoc = 500_000
)

// BagLocation maps a bag ID to its Greenfield bucket and object names.
type BagLocation struct {
	BucketName string `json:"bucket"`
	ObjectName string `json:"object"`
}

// BagEntry pairs a bag ID with its location for batch persistence.
type BagEntry struct {
	BagID    [32]byte
	Location BagLocation
}

// BagIndexedCallback is called after a new bag is successfully persisted.
type BagIndexedCallback func(bagID [32]byte)

// Persister provides a two-tier bag index: in-memory LRU cache for fast reads
// backed by PebbleDB for durability. LookupBag checks memory first, falls back
// to PebbleDB (populating memory on hit). PersistBagsAndHeight writes to both.
type Persister struct {
	db           *pebble.DB
	index        *lru.Cache[[32]byte, BagLocation]
	cbMu         sync.RWMutex
	onBagIndexed BagIndexedCallback
}

// NewPersister creates a Persister backed by the given PebbleDB instance.
func NewPersister(db *pebble.DB) *Persister {
	cache, _ := lru.New[[32]byte, BagLocation](maxCachedBagLoc)
	return &Persister{
		db:    db,
		index: cache,
	}
}

// SetOnBagIndexed registers a callback invoked for each newly persisted bag.
func (p *Persister) SetOnBagIndexed(cb BagIndexedCallback) {
	p.cbMu.Lock()
	p.onBagIndexed = cb
	p.cbMu.Unlock()
}

// LoadLastHeight returns the last persisted block height, or 0 if none.
func (p *Persister) LoadLastHeight() (int64, error) {
	val, closer, err := p.db.Get([]byte(heightKey))
	if err == pebble.ErrNotFound {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("get last height: %w", err)
	}
	defer closer.Close()

	if len(val) != 8 {
		return 0, fmt.Errorf("corrupt height value: expected 8 bytes, got %d", len(val))
	}
	return int64(binary.BigEndian.Uint64(val)), nil
}

// LookupBag retrieves a BagLocation by bag ID.
// Checks the in-memory index first, falls back to PebbleDB.
// On PebbleDB hit, the entry is promoted to the in-memory index.
// Returns false if the bag is not found in either tier.
func (p *Persister) LookupBag(bagID [32]byte) (BagLocation, bool, error) {
	if loc, ok := p.index.Get(bagID); ok {
		return loc, true, nil
	}

	key := makeBagKey(bagID)
	val, closer, err := p.db.Get(key)
	if err == pebble.ErrNotFound {
		return BagLocation{}, false, nil
	}
	if err != nil {
		return BagLocation{}, false, fmt.Errorf("get bag: %w", err)
	}
	defer closer.Close()

	var loc BagLocation
	if err := json.Unmarshal(val, &loc); err != nil {
		return BagLocation{}, false, fmt.Errorf("unmarshal bag location: %w", err)
	}

	p.index.Add(bagID, loc)
	return loc, true, nil
}

// PersistBagsAndHeight atomically writes bag entries and the block height
// to both the in-memory index and PebbleDB.
func (p *Persister) PersistBagsAndHeight(entries []BagEntry, height int64) error {
	batch := p.db.NewBatch()
	defer batch.Close()

	for _, entry := range entries {
		data, err := json.Marshal(entry.Location)
		if err != nil {
			return fmt.Errorf("marshal bag location: %w", err)
		}
		if err := batch.Set(makeBagKey(entry.BagID), data, pebble.Sync); err != nil {
			return fmt.Errorf("set bag entry: %w", err)
		}
	}

	var heightBuf [8]byte
	binary.BigEndian.PutUint64(heightBuf[:], uint64(height))
	if err := batch.Set([]byte(heightKey), heightBuf[:], pebble.Sync); err != nil {
		return fmt.Errorf("set height: %w", err)
	}

	if err := batch.Commit(pebble.Sync); err != nil {
		return fmt.Errorf("commit batch: %w", err)
	}

	for _, entry := range entries {
		p.index.Add(entry.BagID, entry.Location)
	}

	p.cbMu.RLock()
	cb := p.onBagIndexed
	p.cbMu.RUnlock()
	if cb != nil {
		for _, entry := range entries {
			cb(entry.BagID)
		}
	}

	return nil
}

func makeBagKey(bagID [32]byte) []byte {
	key := make([]byte, len(bagKeyPrefix)+32)
	copy(key, bagKeyPrefix)
	copy(key[len(bagKeyPrefix):], bagID[:])
	return key
}
