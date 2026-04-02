package greenfield

import (
	"context"
	"fmt"
	"io"
	"log/slog"

	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// metadataObjectName returns the .ionstorage companion object name.
func metadataObjectName(objectName string) string {
	return objectName + ".ionstorage"
}

// fetchMetadata downloads and parses a .ionstorage BoC from Greenfield.
func fetchMetadata(
	ctx context.Context,
	client greenfieldclient.Client,
	bucket, object string,
	logger *slog.Logger,
) (*boc.BagMetadata, error) {
	metaName := metadataObjectName(object)

	reader, _, err := client.GetObject(ctx, bucket, metaName, greenfieldclient.GetObjectOpts{})
	if err != nil {
		return nil, fmt.Errorf("get metadata %s/%s: %w", bucket, metaName, err)
	}

	data, err := io.ReadAll(reader)
	reader.Close()
	if err != nil {
		return nil, fmt.Errorf("read metadata %s/%s: %w", bucket, metaName, err)
	}

	return boc.ParseIonStorageBoC(data, logger)
}
