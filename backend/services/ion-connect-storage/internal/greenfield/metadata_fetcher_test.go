package greenfield

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestMetadataObjectNaming(t *testing.T) {
	require.Equal(t, "myfile.dat.ionstorage", metadataObjectName("myfile.dat"))
	require.Equal(t, "photo.jpg.ionstorage", metadataObjectName("photo.jpg"))
}
