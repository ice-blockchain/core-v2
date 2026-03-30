package adnl

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

const (
	spoolThreshold = 2 << 20   // spool to disk above 2 MB
	maxBodySize    = 200 << 20 // 200 MB max body size
)

var errBodyTooLarge = errors.New("body exceeds 200 MB limit")

// spoolWriter buffers small writes in memory and spills to a temporary file
// once the accumulated data exceeds spoolThreshold.
type spoolWriter struct {
	file    *os.File
	prefix  string // temp file name prefix
	dir     string // temp file directory (empty = os default)
	buf     bytes.Buffer
	written int64
	spilled bool
}

func (sw *spoolWriter) Write(b []byte) (int, error) {
	if sw.written+int64(len(b)) > maxBodySize {
		return 0, errBodyTooLarge
	}
	if !sw.spilled && int64(sw.buf.Len()+len(b)) > int64(spoolThreshold) {
		_ = sw.spillToDisk() // best-effort; stays in memory on failure
	}
	if sw.spilled {
		n, err := sw.file.Write(b)
		sw.written += int64(n)
		return n, err
	}
	n, err := sw.buf.Write(b)
	sw.written += int64(n)
	return n, err
}

func (sw *spoolWriter) spillToDisk() error {
	f, err := os.CreateTemp(sw.dir, sw.prefix)
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	if sw.buf.Len() > 0 {
		if _, err := f.Write(sw.buf.Bytes()); err != nil {
			f.Close()
			os.Remove(f.Name())
			return err
		}
		sw.buf.Reset()
	}
	sw.file = f
	sw.spilled = true
	return nil
}

// toReadCloser returns the accumulated data as an io.ReadCloser.
// For file-backed data the file is rewound; the caller must close the reader.
func (sw *spoolWriter) toReadCloser() (io.ReadCloser, int64, error) {
	if sw.spilled {
		if _, err := sw.file.Seek(0, io.SeekStart); err != nil {
			sw.Close()
			return nil, 0, err
		}
		f := sw.file
		sw.file = nil // transfer ownership
		return &tempFileReadCloser{file: f}, sw.written, nil
	}
	return io.NopCloser(bytes.NewReader(sw.buf.Bytes())), sw.written, nil
}

// Close releases the underlying temp file, if any.
func (sw *spoolWriter) Close() {
	if sw.file != nil {
		name := sw.file.Name()
		sw.file.Close()
		os.Remove(name)
		sw.file = nil
		sw.spilled = false
	}
}

// spooledPayload stores response body data in memory (small) or on disk (large)
// for incremental retrieval via RLDP GetNextPayloadPart queries.
type spooledPayload struct {
	createdAt time.Time
	file      *os.File
	mem       []byte
	size      int64
	mu        sync.Mutex
}

// newSpooledPayload transfers ownership of the writer's buffered data into a
// spooledPayload. The spoolWriter must not be used after this call.
func newSpooledPayload(sw *spoolWriter) *spooledPayload {
	now := time.Now()
	if sw.spilled {
		sp := &spooledPayload{file: sw.file, size: sw.written, createdAt: now}
		sw.file = nil
		return sp
	}
	if sw.buf.Len() == 0 {
		return nil
	}
	data := make([]byte, sw.buf.Len())
	copy(data, sw.buf.Bytes())
	return &spooledPayload{mem: data, size: int64(len(data)), createdAt: now}
}

// ReadChunk returns the payload chunk for the given RLDP sequence number.
func (s *spooledPayload) ReadChunk(seqno int) ([]byte, bool) {
	offset := int64(seqno) * int64(chunkSize)
	if offset >= s.size {
		return nil, true
	}
	end := offset + int64(chunkSize)
	isLast := end >= s.size
	if isLast {
		end = s.size
	}
	if s.mem != nil {
		return s.mem[offset:end], isLast
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	buf := make([]byte, end-offset)
	n, err := s.file.ReadAt(buf, offset)
	if err != nil && err != io.EOF {
		return nil, true
	}
	return buf[:n], isLast
}

// Close releases the underlying temp file, if any.
func (s *spooledPayload) Close() {
	if s.file != nil {
		name := s.file.Name()
		s.file.Close()
		os.Remove(name)
		s.file = nil
	}
}

// tempFileReadCloser wraps a temp file as io.ReadCloser, deleting it on Close.
type tempFileReadCloser struct {
	file *os.File
}

func (r *tempFileReadCloser) Read(p []byte) (int, error) { return r.file.Read(p) }

func (r *tempFileReadCloser) Close() error {
	name := r.file.Name()
	r.file.Close()
	return os.Remove(name)
}
