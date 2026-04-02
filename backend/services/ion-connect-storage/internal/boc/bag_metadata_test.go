package boc

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestParseIonStorageBoC(t *testing.T) {
	payload := make([]byte, 1024*1024) // 1MB
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	bagID, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))

	meta, err := ParseIonStorageBoC(rawData, testLogger())
	require.NoError(t, err)

	require.Equal(t, bagID, meta.BagID)
	require.Equal(t, uint32(PieceSize), meta.PieceSize)
	require.Equal(t, uint64(1024*1024), meta.FileSize)
	require.Equal(t, 2, meta.PieceCount) // ceil(1MB / 512KB) = 2
	require.NotNil(t, meta.Header)
	require.Len(t, meta.Header.Files, 1)
	require.Equal(t, "data", meta.Header.Files[0].Name)
}

func TestParseIonStorageBoCTooShort(t *testing.T) {
	_, err := ParseIonStorageBoC([]byte{0, 1}, testLogger())
	require.Error(t, err)
	require.Contains(t, err.Error(), "too short")
}

func TestBagIDDeterministic(t *testing.T) {
	payload := []byte("hello world")
	id1, _ := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))
	id2, _ := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))
	require.Equal(t, id1, id2)
}

func TestBuildIonStorageBoCRoundTrip(t *testing.T) {
	payload := make([]byte, 17*1024*1024) // 17MB
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	bagID, rawData := MustBuildIonStorageBoC(t, payload, PieceSize, SingleFileHeader("data", uint64(len(payload))))

	meta, err := ParseIonStorageBoC(rawData, testLogger())
	require.NoError(t, err)
	require.Equal(t, bagID, meta.BagID)
	require.Equal(t, uint64(17*1024*1024), meta.FileSize)
	require.Equal(t, 34, meta.PieceCount) // ceil(17MB / 512KB) = 34
}
