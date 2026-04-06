package cache

import (
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"time"

	expirable "github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/puzpuzpuz/xsync/v4"
)

// BagFileLayout describes the on-disk file structure for a cached bag.
// Maps Greenfield file data (no header) to per-file cache structure.
// The torrent header is stored in PebbleDB metadata, not in the file cache.
type BagFileLayout struct {
	Files     []boc.FileEntry
	TotalSize uint64 // sum of file sizes (raw data, excludes torrent header)
}

type cachedBag struct {
	dirPath string
	layout  BagFileLayout
	written *xsync.Map[int, struct{}]
}

// SegmentCache manages per-file disk caching of bag segments with TTL eviction.
type SegmentCache struct {
	lru     *expirable.LRU[[32]byte, *cachedBag]
	dir     string
	onEvict func(bagID [32]byte)
	logger  *slog.Logger
}

const defaultMaxCachedBags = 10000

// NewSegmentCache creates a disk-based segment cache with TTL eviction.
func NewSegmentCache(
	directory string,
	ttl time.Duration,
	onEvict func(bagID [32]byte),
	logger *slog.Logger,
) *SegmentCache {
	return NewSegmentCacheWithLimit(directory, ttl, defaultMaxCachedBags, onEvict, logger)
}

// NewSegmentCacheWithLimit creates a disk-based segment cache with TTL eviction
// and a maximum number of cached bags to prevent memory exhaustion.
func NewSegmentCacheWithLimit(
	directory string,
	ttl time.Duration,
	maxBags int,
	onEvict func(bagID [32]byte),
	logger *slog.Logger,
) *SegmentCache {
	if maxBags <= 0 {
		maxBags = defaultMaxCachedBags
	}
	c := &SegmentCache{
		dir:     directory,
		onEvict: onEvict,
		logger:  logger,
	}
	c.lru = expirable.NewLRU[[32]byte, *cachedBag](maxBags, c.handleEviction, ttl)
	return c
}

// OpenBag creates the cache directory and pre-allocates files for a bag.
func (c *SegmentCache) OpenBag(bagID [32]byte, layout BagFileLayout) error {
	dirPath := filepath.Join(c.dir, hex.EncodeToString(bagID[:]))
	if err := os.MkdirAll(dirPath, 0o755); err != nil {
		return fmt.Errorf("create cache dir: %w", err)
	}
	if err := preallocateFiles(dirPath, layout); err != nil {
		return err
	}
	bag := &cachedBag{
		dirPath: dirPath,
		layout:  layout,
		written: xsync.NewMap[int, struct{}](),
	}
	c.lru.Add(bagID, bag)
	return nil
}

// maxSegmentIndex is the largest segment index that won't overflow int64 when multiplied by SegmentSize.
const maxSegmentIndex = math.MaxInt64 / int64(boc.SegmentSize)

// SegmentWriter returns a WriteCloser that distributes segment bytes
// to the correct cache files based on the bag's file layout.
func (c *SegmentCache) SegmentWriter(bagID [32]byte, segmentIndex int) (io.WriteCloser, error) {
	bag, ok := c.lru.Get(bagID)
	if !ok {
		return nil, fmt.Errorf("bag %x not opened in cache", bagID)
	}
	if segmentIndex < 0 || int64(segmentIndex) > maxSegmentIndex {
		return nil, fmt.Errorf("segment index %d out of safe range", segmentIndex)
	}
	startOffset := int64(segmentIndex) * int64(boc.SegmentSize)
	return newSegmentDistributor(bag.dirPath, bag.layout, startOffset), nil
}

// MarkSegmentWritten records that a segment has been fully written to cache.
func (c *SegmentCache) MarkSegmentWritten(bagID [32]byte, segmentIndex int) {
	bag, ok := c.lru.Get(bagID)
	if !ok {
		return
	}
	bag.written.Store(segmentIndex, struct{}{})
}

// GetSegment reads a cached segment from disk files into a contiguous buffer.
func (c *SegmentCache) GetSegment(bagID [32]byte, segmentIndex int) ([]byte, bool, error) {
	bag, ok := c.lru.Get(bagID)
	if !ok {
		return nil, false, nil
	}
	if _, ok := bag.written.Load(segmentIndex); !ok {
		return nil, false, nil
	}
	return readSegmentFromFiles(bag, segmentIndex)
}

// HasSegment checks if a segment is cached and written.
func (c *SegmentCache) HasSegment(bagID [32]byte, segmentIndex int) bool {
	bag, ok := c.lru.Get(bagID)
	if !ok {
		return false
	}
	_, ok = bag.written.Load(segmentIndex)
	return ok
}

// HasBag checks if a bag is present in the cache.
func (c *SegmentCache) HasBag(bagID [32]byte) bool {
	return c.lru.Contains(bagID)
}

func (c *SegmentCache) handleEviction(bagID [32]byte, bag *cachedBag) {
	if err := os.RemoveAll(bag.dirPath); err != nil {
		c.logger.Warn("failed to remove cache dir", "path", bag.dirPath, "error", err)
	}
	if c.onEvict != nil {
		c.onEvict(bagID)
	}
}
