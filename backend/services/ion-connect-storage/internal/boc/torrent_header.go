package boc

import (
	"bytes"
	"encoding/binary"
	"fmt"
)

const (
	headerMinSize     = 32 // TLConstructor(4) + FilesCount(4) + TotalNameSize(8) + TotalDataSize(8) + FEC(4) + DirNameSize(4)
	torrentHeaderTLID = 0x9128aab7
	fecInfoNoneID     = 0xc82a1964
)

// FileEntry describes a single file within a torrent bag.
type FileEntry struct {
	Name   string
	Size   uint64
	Offset uint64 // byte offset relative to data start (after header)
}

// TorrentHeader holds the torrent header describing files in a bag.
type TorrentHeader struct {
	DirName string
	Files   []FileEntry
}

// SerializeTorrentHeader serializes a TorrentHeader to TL-boxed binary format.
// Produces bytes identical to tonutils-storage's tl.Serialize(TorrentHeader{}, true).
func SerializeTorrentHeader(header *TorrentHeader) ([]byte, error) {
	buf := new(bytes.Buffer)

	// TL constructor ID prefix (boxed)
	writeLEUint32(buf, torrentHeaderTLID)

	if err := header.serialize(buf); err != nil {
		return nil, fmt.Errorf("serialize header: %w", err)
	}
	return buf.Bytes(), nil
}

// ParseTorrentHeader parses a TL-boxed binary torrent header.
func ParseTorrentHeader(data []byte) (*TorrentHeader, error) {
	if len(data) < headerMinSize {
		return nil, fmt.Errorf("header too short: %d bytes, need at least %d", len(data), headerMinSize)
	}

	// Verify and skip TL constructor ID
	tlID := binary.LittleEndian.Uint32(data)
	if tlID != torrentHeaderTLID {
		return nil, fmt.Errorf("unexpected TL ID: 0x%08x, expected 0x%08x", tlID, torrentHeaderTLID)
	}
	data = data[4:]

	var header TorrentHeader
	_, err := header.parse(data)
	if err != nil {
		return nil, err
	}
	return &header, nil
}

// serialize writes the header fields in tonutils-storage wire format.
func (h *TorrentHeader) serialize(buf *bytes.Buffer) error {
	names, nameIndex, dataIndex := buildIndices(h.Files)

	writeLEUint32(buf, uint32(len(h.Files)))
	writeLEUint64(buf, uint64(len(names)))
	writeLEUint64(buf, 0) // TotalDataSize: 0 during creation

	writeLEUint32(buf, fecInfoNoneID) // FEC: fec_info_none constructor ID

	writeLEUint32(buf, uint32(len(h.DirName)))
	buf.Write([]byte(h.DirName))

	for _, v := range nameIndex {
		writeLEUint64(buf, v)
	}
	for _, v := range dataIndex {
		writeLEUint64(buf, v)
	}
	buf.Write(names)
	return nil
}

// parse reads header fields from unboxed binary data (no TL constructor prefix).
func (h *TorrentHeader) parse(data []byte) ([]byte, error) {
	if len(data) < 20 {
		return nil, fmt.Errorf("header too short for sizes: %d bytes", len(data))
	}

	filesCount := binary.LittleEndian.Uint32(data)
	totalNameSize := binary.LittleEndian.Uint64(data[4:])
	totalDataSize := binary.LittleEndian.Uint64(data[12:])
	data = data[20:]

	if len(data) < 4 {
		return nil, fmt.Errorf("header too short for FEC")
	}
	fecID := binary.LittleEndian.Uint32(data)
	if fecID != fecInfoNoneID {
		return nil, fmt.Errorf("unsupported FEC: 0x%08x, expected 0x%08x", fecID, fecInfoNoneID)
	}
	data = data[4:]

	if len(data) < 4 {
		return nil, fmt.Errorf("header too short for DirNameSize")
	}
	dirNameSize := binary.LittleEndian.Uint32(data)
	data = data[4:]

	needed := uint64(dirNameSize) + uint64(filesCount)*16 + totalNameSize + totalDataSize
	if uint64(len(data)) < needed {
		return nil, fmt.Errorf("header truncated: need %d, have %d", needed, len(data))
	}

	h.DirName = string(data[:dirNameSize])
	data = data[dirNameSize:]

	var err error
	h.Files, data, err = parseFileEntries(data, filesCount, totalNameSize, totalDataSize)
	return data, err
}

func buildIndices(files []FileEntry) (names []byte, nameIndex, dataIndex []uint64) {
	nameIndex = make([]uint64, len(files))
	dataIndex = make([]uint64, len(files))
	cumData := uint64(0)
	for i, f := range files {
		names = append(names, f.Name...)
		nameIndex[i] = uint64(len(names))
		cumData += f.Size
		dataIndex[i] = cumData
	}
	return names, nameIndex, dataIndex
}

func parseFileEntries(data []byte, filesCount uint32, totalNameSize, totalDataSize uint64) ([]FileEntry, []byte, error) {
	nameIndex := make([]uint64, filesCount)
	dataIndex := make([]uint64, filesCount)
	for i := uint32(0); i < filesCount; i++ {
		nameIndex[i] = binary.LittleEndian.Uint64(data[i*8:])
		dataIndex[i] = binary.LittleEndian.Uint64(data[filesCount*8+i*8:])
	}
	data = data[filesCount*16:]

	names := data[:totalNameSize]
	data = data[totalNameSize+totalDataSize:]

	files := make([]FileEntry, filesCount)
	for i := uint32(0); i < filesCount; i++ {
		nameStart := uint64(0)
		if i > 0 {
			nameStart = nameIndex[i-1]
		}
		nameEnd := nameIndex[i]
		if nameEnd > uint64(len(names)) || nameStart > nameEnd {
			return nil, nil, fmt.Errorf("file %d: name index out of bounds", i)
		}
		dataStart := uint64(0)
		if i > 0 {
			dataStart = dataIndex[i-1]
		}
		files[i] = FileEntry{
			Name:   string(names[nameStart:nameEnd]),
			Size:   dataIndex[i] - dataStart,
			Offset: dataStart,
		}
	}
	return files, data, nil
}

func writeLEUint32(buf *bytes.Buffer, v uint32) {
	var b [4]byte
	binary.LittleEndian.PutUint32(b[:], v)
	buf.Write(b[:])
}

func writeLEUint64(buf *bytes.Buffer, v uint64) {
	var b [8]byte
	binary.LittleEndian.PutUint64(b[:], v)
	buf.Write(b[:])
}
