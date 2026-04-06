package boc

import (
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseTorrentHeaderSingleFile(t *testing.T) {
	header := &TorrentHeader{
		Files: []FileEntry{
			{Name: "video.mp4", Size: 1024 * 1024},
		},
	}
	data, err := SerializeTorrentHeader(header)
	require.NoError(t, err)

	parsed, err := ParseTorrentHeader(data)
	require.NoError(t, err)
	require.Len(t, parsed.Files, 1)
	require.Equal(t, "video.mp4", parsed.Files[0].Name)
	require.Equal(t, uint64(1024*1024), parsed.Files[0].Size)
	require.Equal(t, uint64(0), parsed.Files[0].Offset)
}

func TestParseTorrentHeaderMultipleFiles(t *testing.T) {
	header := &TorrentHeader{
		Files: []FileEntry{
			{Name: "a.txt", Size: 100},
			{Name: "b.jpg", Size: 200},
			{Name: "c.bin", Size: 300},
		},
	}
	data, err := SerializeTorrentHeader(header)
	require.NoError(t, err)

	parsed, err := ParseTorrentHeader(data)
	require.NoError(t, err)
	require.Len(t, parsed.Files, 3)

	require.Equal(t, "a.txt", parsed.Files[0].Name)
	require.Equal(t, uint64(100), parsed.Files[0].Size)
	require.Equal(t, uint64(0), parsed.Files[0].Offset)

	require.Equal(t, "b.jpg", parsed.Files[1].Name)
	require.Equal(t, uint64(200), parsed.Files[1].Size)
	require.Equal(t, uint64(100), parsed.Files[1].Offset)

	require.Equal(t, "c.bin", parsed.Files[2].Name)
	require.Equal(t, uint64(300), parsed.Files[2].Size)
	require.Equal(t, uint64(300), parsed.Files[2].Offset)
}

func TestSerializeAndParseTorrentHeader(t *testing.T) {
	original := &TorrentHeader{
		DirName: "mydir",
		Files: []FileEntry{
			{Name: "file1.dat", Size: 5000},
			{Name: "file2.dat", Size: 3000},
		},
	}
	data, err := SerializeTorrentHeader(original)
	require.NoError(t, err)

	parsed, err := ParseTorrentHeader(data)
	require.NoError(t, err)
	require.Equal(t, original.DirName, parsed.DirName)
	require.Len(t, parsed.Files, 2)
	require.Equal(t, original.Files[0].Name, parsed.Files[0].Name)
	require.Equal(t, original.Files[0].Size, parsed.Files[0].Size)
	require.Equal(t, original.Files[1].Name, parsed.Files[1].Name)
	require.Equal(t, original.Files[1].Size, parsed.Files[1].Size)
}

func TestParseTorrentHeaderTooShort(t *testing.T) {
	_, err := ParseTorrentHeader([]byte{0, 1, 2})
	require.Error(t, err)
	require.Contains(t, err.Error(), "too short")
}

func TestParseTorrentHeaderZeroFiles(t *testing.T) {
	header := &TorrentHeader{
		DirName: "empty",
		Files:   []FileEntry{},
	}
	data, err := SerializeTorrentHeader(header)
	require.NoError(t, err)

	parsed, err := ParseTorrentHeader(data)
	require.NoError(t, err)
	require.Len(t, parsed.Files, 0)
	require.Equal(t, "empty", parsed.DirName)
}

func TestParseTorrentHeaderOverflowFilesCount(t *testing.T) {
	// Craft a minimal header with filesCount = 0xFFFFFFFF to trigger overflow.
	data := make([]byte, headerMinSize+20)
	binary.LittleEndian.PutUint32(data[0:], torrentHeaderTLID) // TL ID
	binary.LittleEndian.PutUint32(data[4:], 0xFFFFFFFF)        // filesCount
	binary.LittleEndian.PutUint64(data[8:], 0)                 // totalNameSize
	binary.LittleEndian.PutUint64(data[16:], 0)                // totalDataSize
	binary.LittleEndian.PutUint32(data[24:], fecInfoNoneID)    // FEC
	binary.LittleEndian.PutUint32(data[28:], 0)                // dirNameSize

	_, err := ParseTorrentHeader(data)
	require.Error(t, err)
	require.Contains(t, err.Error(), "exceeds maximum")
}

func TestParseTorrentHeaderOverflowTotalSize(t *testing.T) {
	// Craft header where totalNameSize + totalDataSize overflows uint64.
	data := make([]byte, headerMinSize+20)
	binary.LittleEndian.PutUint32(data[0:], torrentHeaderTLID)
	binary.LittleEndian.PutUint32(data[4:], 1)              // filesCount
	binary.LittleEndian.PutUint64(data[8:], ^uint64(0))     // totalNameSize = max uint64
	binary.LittleEndian.PutUint64(data[16:], 1)             // totalDataSize = 1 -> overflow
	binary.LittleEndian.PutUint32(data[24:], fecInfoNoneID) // FEC
	binary.LittleEndian.PutUint32(data[28:], 0)             // dirNameSize

	_, err := ParseTorrentHeader(data)
	require.Error(t, err)
	require.Contains(t, err.Error(), "overflow")
}

func TestParseTorrentHeaderWithDirName(t *testing.T) {
	header := &TorrentHeader{
		DirName: "photos/vacation",
		Files: []FileEntry{
			{Name: "sunset.jpg", Size: 4096},
		},
	}
	data, err := SerializeTorrentHeader(header)
	require.NoError(t, err)

	parsed, err := ParseTorrentHeader(data)
	require.NoError(t, err)
	require.Equal(t, "photos/vacation", parsed.DirName)
	require.Len(t, parsed.Files, 1)
	require.Equal(t, "sunset.jpg", parsed.Files[0].Name)
}
