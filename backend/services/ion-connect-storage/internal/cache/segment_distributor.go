package cache

import (
	"fmt"
	"math"
	"os"
	"path/filepath"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// segmentDistributor implements io.WriteCloser, distributing incoming bytes
// to the correct cache files based on BagFileLayout offset mapping.
type segmentDistributor struct {
	layout    BagFileLayout
	dirPath   string
	bagOffset int64
	files     map[string]*os.File
}

func newSegmentDistributor(dirPath string, layout BagFileLayout, startOffset int64) *segmentDistributor {
	return &segmentDistributor{
		layout:    layout,
		dirPath:   dirPath,
		bagOffset: startOffset,
		files:     make(map[string]*os.File),
	}
}

func (d *segmentDistributor) Write(p []byte) (int, error) {
	totalWritten := 0
	for totalWritten < len(p) {
		n, err := d.writeChunk(p[totalWritten:])
		totalWritten += n
		if err != nil {
			return totalWritten, err
		}
	}
	return totalWritten, nil
}

func (d *segmentDistributor) writeChunk(p []byte) (int, error) {
	fileName, fileOffset, maxBytes := d.resolveOffset(d.bagOffset)
	toWrite := min(int64(len(p)), maxBytes)
	if toWrite <= 0 {
		return 0, fmt.Errorf("offset %d beyond bag data", d.bagOffset)
	}

	f, err := d.openFile(fileName)
	if err != nil {
		return 0, err
	}
	n, err := f.WriteAt(p[:toWrite], fileOffset)
	d.bagOffset += int64(n)
	return n, err
}

// resolveOffset maps a data byte offset to (fileName, fileOffset, remainingBytes).
// Offsets are relative to raw file data (no torrent header prefix).
func (d *segmentDistributor) resolveOffset(absOffset int64) (string, int64, int64) {
	for _, f := range d.layout.Files {
		if f.Offset > math.MaxInt64-f.Size {
			continue // skip entries where Offset+Size overflows
		}
		fileEnd := int64(f.Offset + f.Size)
		if absOffset < fileEnd {
			localOffset := absOffset - int64(f.Offset)
			remaining := int64(f.Size) - localOffset
			return f.Name, localOffset, remaining
		}
	}
	return "", 0, 0
}

func (d *segmentDistributor) openFile(name string) (*os.File, error) {
	if f, ok := d.files[name]; ok {
		return f, nil
	}
	f, err := os.OpenFile(filepath.Join(d.dirPath, name), os.O_WRONLY, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open cache file %s: %w", name, err)
	}
	d.files[name] = f
	return f, nil
}

func (d *segmentDistributor) Close() error {
	var firstErr error
	for _, f := range d.files {
		if err := f.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	d.files = nil
	return firstErr
}

// readSegmentFromFiles reads a cached segment from disk files into a buffer.
func readSegmentFromFiles(bag *cachedBag, segmentIndex int) ([]byte, bool, error) {
	startOffset := int64(segmentIndex) * int64(boc.SegmentSize)
	segmentEnd := startOffset + int64(boc.SegmentSize)
	if segmentEnd > int64(bag.layout.TotalSize) {
		segmentEnd = int64(bag.layout.TotalSize)
	}
	segmentLen := segmentEnd - startOffset
	buf := make([]byte, segmentLen)

	reader := &segmentFileReader{layout: bag.layout, dirPath: bag.dirPath}
	defer reader.close()

	if err := reader.readAt(buf, startOffset); err != nil {
		return nil, false, fmt.Errorf("read segment %d: %w", segmentIndex, err)
	}
	return buf, true, nil
}

// segmentFileReader reads from cache files at arbitrary bag offsets.
type segmentFileReader struct {
	layout  BagFileLayout
	dirPath string
	files   map[string]*os.File
}

func (r *segmentFileReader) readAt(buf []byte, absOffset int64) error {
	if r.files == nil {
		r.files = make(map[string]*os.File)
	}
	read := 0
	for read < len(buf) {
		n, err := r.readChunk(buf[read:], absOffset+int64(read))
		read += n
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *segmentFileReader) readChunk(buf []byte, absOffset int64) (int, error) {
	dist := &segmentDistributor{layout: r.layout, dirPath: r.dirPath}
	fileName, fileOffset, maxBytes := dist.resolveOffset(absOffset)
	toRead := min(int64(len(buf)), maxBytes)
	if toRead <= 0 {
		return 0, fmt.Errorf("offset %d beyond bag data", absOffset)
	}

	f, err := r.openFile(fileName)
	if err != nil {
		return 0, err
	}
	return f.ReadAt(buf[:toRead], fileOffset)
}

func (r *segmentFileReader) openFile(name string) (*os.File, error) {
	if f, ok := r.files[name]; ok {
		return f, nil
	}
	f, err := os.Open(filepath.Join(r.dirPath, name))
	if err != nil {
		return nil, fmt.Errorf("open cache file %s for read: %w", name, err)
	}
	r.files[name] = f
	return f, nil
}

func (r *segmentFileReader) close() {
	for _, f := range r.files {
		f.Close()
	}
}
