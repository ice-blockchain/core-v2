package cache

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func bagDirPath(cacheDir string, bagID [32]byte) string {
	return filepath.Join(cacheDir, hex.EncodeToString(bagID[:]))
}

func testLayout() BagFileLayout {
	return BagFileLayout{
		Files: []boc.FileEntry{
			{Name: "data.bin", Size: 1024, Offset: 0},
		},
		TotalSize: 1024,
	}
}

func testBagID() [32]byte {
	var id [32]byte
	id[0] = 0xDE
	id[1] = 0xAD
	return id
}

func TestSegmentCacheOpenBagCreatesFiles(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	layout := testLayout()

	require.NoError(t, cache.OpenBag(bagID, layout))

	dirPath := bagDirPath(cache.dir, bagID)

	entries, err := os.ReadDir(dirPath)
	require.NoError(t, err)
	require.Len(t, entries, 1) // data.bin only (no _header, header lives in metadata store)

	dataInfo, err := os.Stat(filepath.Join(dirPath, "data.bin"))
	require.NoError(t, err)
	require.Equal(t, int64(1024), dataInfo.Size())
}

func TestSegmentCacheWriteAndReadSegment(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	layout := testLayout()
	require.NoError(t, cache.OpenBag(bagID, layout))

	payload := make([]byte, layout.TotalSize)
	_, err := rand.Read(payload)
	require.NoError(t, err)

	wc, err := cache.SegmentWriter(bagID, 0)
	require.NoError(t, err)
	_, err = wc.Write(payload)
	require.NoError(t, err)
	require.NoError(t, wc.Close())
	cache.MarkSegmentWritten(bagID, 0)

	data, ok, err := cache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, payload, data)
}

func TestSegmentCacheGetMiss(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	var bagID [32]byte
	_, ok, err := cache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.False(t, ok)
}

func TestSegmentCacheGetUnwrittenSegment(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	require.NoError(t, cache.OpenBag(bagID, testLayout()))

	_, ok, err := cache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.False(t, ok)
}

func TestSegmentCacheTeeReaderPattern(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	layout := testLayout()
	require.NoError(t, cache.OpenBag(bagID, layout))

	original := make([]byte, layout.TotalSize)
	_, err := rand.Read(original)
	require.NoError(t, err)

	wc, err := cache.SegmentWriter(bagID, 0)
	require.NoError(t, err)

	// TeeReader pattern: read from source, tee to cache writer
	var buf bytes.Buffer
	tee := io.TeeReader(bytes.NewReader(original), wc)
	_, err = io.ReadAll(tee)
	require.NoError(t, err)
	require.NoError(t, wc.Close())
	cache.MarkSegmentWritten(bagID, 0)

	// buf was not used in this tee (tee copies to wc), but let's verify via GetSegment
	_ = buf
	cached, ok, err := cache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, original, cached)

	// Also verify using TeeReader the other direction: source -> buf with tee to cache
	bagID2 := [32]byte{0x02}
	require.NoError(t, cache.OpenBag(bagID2, layout))
	wc2, err := cache.SegmentWriter(bagID2, 0)
	require.NoError(t, err)

	var buf2 bytes.Buffer
	tee2 := io.TeeReader(bytes.NewReader(original), io.MultiWriter(wc2, &buf2))
	teeResult, err := io.ReadAll(tee2)
	require.NoError(t, err)
	require.NoError(t, wc2.Close())
	cache.MarkSegmentWritten(bagID2, 0)

	require.Equal(t, original, teeResult)
	require.Equal(t, original, buf2.Bytes())
}

func TestSegmentWriterRejectsNegativeIndex(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	require.NoError(t, cache.OpenBag(bagID, testLayout()))

	_, err := cache.SegmentWriter(bagID, -1)
	require.Error(t, err)
	require.Contains(t, err.Error(), "safe range")
}

func TestSegmentWriterRejectsOverflowIndex(t *testing.T) {
	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	require.NoError(t, cache.OpenBag(bagID, testLayout()))

	_, err := cache.SegmentWriter(bagID, int(maxSegmentIndex)+1)
	require.Error(t, err)
	require.Contains(t, err.Error(), "safe range")
}

func TestSegmentCacheEvictionDeletesDirectory(t *testing.T) {
	var evictedBagID [32]byte
	evicted := false

	cache := NewSegmentCache(t.TempDir(), 50*time.Millisecond, func(bagID [32]byte) {
		evictedBagID = bagID
		evicted = true
	}, testLogger())

	bagID := testBagID()
	require.NoError(t, cache.OpenBag(bagID, testLayout()))
	require.True(t, cache.HasBag(bagID))

	time.Sleep(100 * time.Millisecond)
	// Access triggers cleanup of expired entries
	cache.HasBag(bagID)
	time.Sleep(50 * time.Millisecond)

	require.True(t, evicted)
	require.Equal(t, bagID, evictedBagID)
	require.False(t, cache.HasBag(bagID))
}
