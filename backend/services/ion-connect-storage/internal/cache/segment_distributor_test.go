package cache

import (
	"crypto/rand"
	"math"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/stretchr/testify/require"
)

func TestSegmentCacheCrossFileBoundary(t *testing.T) {
	layout := BagFileLayout{
		Files: []boc.FileEntry{
			{Name: "file1.dat", Size: 200, Offset: 0},
			{Name: "file2.dat", Size: 300, Offset: 200},
		},
		TotalSize: 500,
	}

	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
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

	dirPath := bagDirPath(cache.dir, bagID)

	file1Data, err := os.ReadFile(filepath.Join(dirPath, "file1.dat"))
	require.NoError(t, err)
	require.Equal(t, payload[:200], file1Data)

	file2Data, err := os.ReadFile(filepath.Join(dirPath, "file2.dat"))
	require.NoError(t, err)
	require.Equal(t, payload[200:500], file2Data)

	data, ok, err := cache.GetSegment(bagID, 0)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, payload, data)
}

func TestSegmentCacheConcurrentSegmentWrites(t *testing.T) {
	layout := BagFileLayout{
		Files: []boc.FileEntry{
			{Name: "big.dat", Size: 2048, Offset: 0},
		},
		TotalSize: 2048,
	}

	cache := NewSegmentCache(t.TempDir(), time.Hour, nil, testLogger())
	bagID := testBagID()
	require.NoError(t, cache.OpenBag(bagID, layout))

	seg0 := make([]byte, 1024)
	seg1 := make([]byte, 1024)
	_, _ = rand.Read(seg0)
	_, _ = rand.Read(seg1)

	var wg sync.WaitGroup
	errs := make(chan error, 2)
	wg.Add(2)
	writeSegment := func(segIdx int, data []byte) {
		defer wg.Done()
		dist := newSegmentDistributor(
			bagDirPath(cache.dir, bagID),
			layout,
			int64(segIdx)*1024,
		)
		if _, wErr := dist.Write(data); wErr != nil {
			errs <- wErr
			return
		}
		errs <- dist.Close()
	}

	go writeSegment(0, seg0)
	go writeSegment(1, seg1)
	wg.Wait()
	close(errs)
	for wErr := range errs {
		require.NoError(t, wErr)
	}

	dirPath := bagDirPath(cache.dir, bagID)
	fullData, err := os.ReadFile(filepath.Join(dirPath, "big.dat"))
	require.NoError(t, err)
	require.Equal(t, seg0, fullData[:1024])
	require.Equal(t, seg1, fullData[1024:])
}

func TestPreallocateRejectsPathTraversal(t *testing.T) {
	dir := t.TempDir()

	malicious := []string{
		"../../../etc/passwd",
		"/etc/passwd",
		"foo/../../../bar",
		"..\\windows\\system32",
	}
	for _, name := range malicious {
		layout := BagFileLayout{
			Files:     []boc.FileEntry{{Name: name, Size: 10, Offset: 0}},
			TotalSize: 10,
		}
		err := preallocateFiles(dir, layout)
		require.Error(t, err, "expected error for %q", name)
	}
}

func TestPreallocateAcceptsValidNames(t *testing.T) {
	dir := t.TempDir()

	valid := []string{"data.bin", "subdir/file.txt"}
	for _, name := range valid {
		layout := BagFileLayout{
			Files:     []boc.FileEntry{{Name: name, Size: 10, Offset: 0}},
			TotalSize: 10,
		}
		err := preallocateFiles(dir, layout)
		require.NoError(t, err, "unexpected error for %q", name)
	}
}

func TestReadSegmentRejectsOverflowTotalSize(t *testing.T) {
	bag := &cachedBag{
		layout:  BagFileLayout{TotalSize: math.MaxUint64},
		dirPath: t.TempDir(),
	}
	_, _, err := readSegmentFromFiles(bag, 0)
	require.ErrorContains(t, err, "exceeds int64 max")
}

func TestReadSegmentRejectsZeroLengthSegment(t *testing.T) {
	bag := &cachedBag{
		layout:  BagFileLayout{TotalSize: 0},
		dirPath: t.TempDir(),
	}
	_, _, err := readSegmentFromFiles(bag, 0)
	require.ErrorContains(t, err, "invalid length")
}

func TestPreallocateRejectsEmptyName(t *testing.T) {
	dir := t.TempDir()
	layout := BagFileLayout{
		Files:     []boc.FileEntry{{Name: "", Size: 10, Offset: 0}},
		TotalSize: 10,
	}
	err := preallocateFiles(dir, layout)
	require.Error(t, err)
	require.Contains(t, err.Error(), "empty file name")
}

func TestEnsurePathInsideRejectsSymlinkEscape(t *testing.T) {
	base := t.TempDir()
	outside := t.TempDir()

	// Create a symlink inside base that points outside.
	symlink := filepath.Join(base, "escape")
	require.NoError(t, os.Symlink(outside, symlink))

	target := filepath.Join(base, "escape", "secret.txt")
	err := ensurePathInside(base, target)
	require.Error(t, err, "symlink escape must be rejected")
	require.Contains(t, err.Error(), "path traversal")
}
