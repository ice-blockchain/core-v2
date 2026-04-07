package adnl

import (
	"crypto/rand"
	"io"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestSpoolWriter_smallWriteStaysInMemory(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}
	n, err := sw.Write([]byte("hello"))
	require.NoError(t, err)
	require.Equal(t, 5, n)
	require.False(t, sw.spilled)
	require.Equal(t, int64(5), sw.written)
	require.Equal(t, "hello", sw.buf.String())
	require.Nil(t, sw.file)
}

func TestSpoolWriter_spillsToDiskAboveThreshold(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	sw := spoolWriter{prefix: "test-*", dir: dir}

	data := make([]byte, spoolThreshold+1)
	_, err := rand.Read(data)
	require.NoError(t, err)

	n, err := sw.Write(data)
	require.NoError(t, err)
	require.Equal(t, len(data), n)
	require.True(t, sw.spilled)
	require.NotNil(t, sw.file)
	require.Equal(t, int64(len(data)), sw.written)
	require.Equal(t, 0, sw.buf.Len(), "buffer should be cleared after spill")

	sw.Close()
}

func TestSpoolWriter_multipleWritesSpillCumulatively(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}

	chunk := make([]byte, spoolThreshold/2+1)
	_, err := sw.Write(chunk)
	require.NoError(t, err)
	require.False(t, sw.spilled, "first write should stay in memory")

	_, err = sw.Write(chunk)
	require.NoError(t, err)
	require.True(t, sw.spilled, "cumulative size should trigger spill")

	sw.Close()
}

func TestSpoolWriter_rejectsWriteAboveMaxBodySize(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}
	sw.written = maxBodySize - 10

	_, err := sw.Write(make([]byte, 11))
	require.ErrorIs(t, err, errBodyTooLarge)
}

func TestSpoolWriter_closeRemovesTempFile(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}

	_, err := sw.Write(make([]byte, spoolThreshold+1))
	require.NoError(t, err)
	require.True(t, sw.spilled)

	path := sw.file.Name()
	_, err = os.Stat(path)
	require.NoError(t, err, "temp file should exist before Close")

	sw.Close()
	_, err = os.Stat(path)
	require.True(t, os.IsNotExist(err), "temp file should be removed after Close")
	require.Nil(t, sw.file)
	require.False(t, sw.spilled)
}

func TestSpoolWriter_closeIsNoopWithoutFile(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*"}
	sw.Close() // should not panic
}

func TestSpoolWriter_toReadCloserInMemory(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*"}
	sw.Write([]byte("payload"))

	rc, size, err := sw.toReadCloser()
	require.NoError(t, err)
	require.Equal(t, int64(7), size)

	data, err := io.ReadAll(rc)
	require.NoError(t, err)
	require.Equal(t, "payload", string(data))
	require.NoError(t, rc.Close())
}

func TestSpoolWriter_toReadCloserFromFile(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}

	original := make([]byte, spoolThreshold+100)
	_, err := rand.Read(original)
	require.NoError(t, err)
	sw.Write(original)
	require.True(t, sw.spilled)

	rc, size, err := sw.toReadCloser()
	require.NoError(t, err)
	require.Equal(t, int64(len(original)), size)
	require.Nil(t, sw.file, "file ownership should transfer")

	data, err := io.ReadAll(rc)
	require.NoError(t, err)
	require.Equal(t, original, data)
	require.NoError(t, rc.Close())
}

func TestSpooledPayload_readChunkInMemory(t *testing.T) {
	t.Parallel()
	body := make([]byte, chunkSize+100)
	for i := range body {
		body[i] = byte(i % 256)
	}
	sp := &spooledPayload{mem: body, size: int64(len(body)), createdAt: time.Now()}

	chunk0, last0 := sp.ReadChunk(0)
	require.Len(t, chunk0, chunkSize)
	require.False(t, last0)
	require.Equal(t, body[:chunkSize], chunk0)

	chunk1, last1 := sp.ReadChunk(1)
	require.Len(t, chunk1, 100)
	require.True(t, last1)
	require.Equal(t, body[chunkSize:], chunk1)
}

func TestSpooledPayload_readChunkFromFile(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	body := make([]byte, chunkSize+50)
	_, err := rand.Read(body)
	require.NoError(t, err)

	f, err := os.CreateTemp(dir, "test-*")
	require.NoError(t, err)
	_, err = f.Write(body)
	require.NoError(t, err)

	sp := &spooledPayload{file: f, size: int64(len(body)), createdAt: time.Now()}

	chunk0, last0 := sp.ReadChunk(0)
	require.Len(t, chunk0, chunkSize)
	require.False(t, last0)
	require.Equal(t, body[:chunkSize], chunk0)

	chunk1, last1 := sp.ReadChunk(1)
	require.Len(t, chunk1, 50)
	require.True(t, last1)
	require.Equal(t, body[chunkSize:], chunk1)

	sp.Close()
}

func TestSpooledPayload_readChunkBeyondEnd(t *testing.T) {
	t.Parallel()
	sp := &spooledPayload{mem: []byte("small"), size: 5, createdAt: time.Now()}

	chunk, isLast := sp.ReadChunk(999)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestSpooledPayload_closeRemovesFile(t *testing.T) {
	t.Parallel()
	f, err := os.CreateTemp(t.TempDir(), "test-*")
	require.NoError(t, err)
	path := f.Name()

	sp := &spooledPayload{file: f, size: 0, createdAt: time.Now()}
	sp.Close()

	_, err = os.Stat(path)
	require.True(t, os.IsNotExist(err))
	require.Nil(t, sp.file)
}

func TestSpooledPayload_closeIsNoopForInMemory(t *testing.T) {
	t.Parallel()
	sp := &spooledPayload{mem: []byte("data"), size: 4, createdAt: time.Now()}
	sp.Close() // should not panic
}

func TestNewSpooledPayload_fromMemory(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*"}
	sw.Write([]byte("hello"))

	sp := newSpooledPayload(&sw)
	require.NotNil(t, sp)
	require.Equal(t, int64(5), sp.size)
	require.Equal(t, []byte("hello"), sp.mem)
	require.Nil(t, sp.file)
	require.False(t, sp.createdAt.IsZero())
}

func TestNewSpooledPayload_fromFile(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*", dir: t.TempDir()}
	sw.Write(make([]byte, spoolThreshold+1))
	require.True(t, sw.spilled)

	sp := newSpooledPayload(&sw)
	require.NotNil(t, sp)
	require.Equal(t, int64(spoolThreshold+1), sp.size)
	require.NotNil(t, sp.file)
	require.Nil(t, sw.file, "ownership should transfer to payload")
	require.False(t, sp.createdAt.IsZero())

	sp.Close()
}

func TestNewSpooledPayload_nilForEmptyWriter(t *testing.T) {
	t.Parallel()
	sw := spoolWriter{prefix: "test-*"}
	sp := newSpooledPayload(&sw)
	require.Nil(t, sp)
}

func TestTempFileReadCloser_readsAndDeletesOnClose(t *testing.T) {
	t.Parallel()
	f, err := os.CreateTemp(t.TempDir(), "test-*")
	require.NoError(t, err)
	path := f.Name()
	f.Write([]byte("content"))
	f.Seek(0, io.SeekStart)

	rc := &tempFileReadCloser{file: f}
	data, err := io.ReadAll(rc)
	require.NoError(t, err)
	require.Equal(t, "content", string(data))

	require.NoError(t, rc.Close())
	_, err = os.Stat(path)
	require.True(t, os.IsNotExist(err))
}

func TestSpoolWriter_usesConfiguredDirectory(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	sw := spoolWriter{prefix: "test-*", dir: dir}

	sw.Write(make([]byte, spoolThreshold+1))
	require.True(t, sw.spilled)

	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	require.Len(t, entries, 1, "temp file should be in the configured directory")

	sw.Close()

	entries, err = os.ReadDir(dir)
	require.NoError(t, err)
	require.Empty(t, entries, "temp file should be removed after close")
}
