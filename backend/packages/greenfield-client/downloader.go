package greenfieldclient

import (
	"context"
	"fmt"
	"io"

	gnfdsdktypes "github.com/bnb-chain/greenfield-go-sdk/types"
)

// GetObject returns a stream reader and metadata for the specified object.
func (c *client) GetObject(
	ctx context.Context,
	bucketName, objectName string,
	opts GetObjectOpts,
) (io.ReadCloser, ObjectStat, error) {
	sdkOpts := gnfdsdktypes.GetObjectOptions{
		Range: opts.Range,
	}

	reader, stat, err := c.gnfdClient.GetObject(ctx, bucketName, objectName, sdkOpts)
	if err != nil {
		return nil, ObjectStat{}, fmt.Errorf("get object %s/%s: %w", bucketName, objectName, err)
	}

	return reader, ObjectStat{
		ObjectName:  stat.ObjectName,
		ContentType: stat.ContentType,
		Size:        stat.Size,
	}, nil
}

// FGetObject downloads an object directly to a local file.
func (c *client) FGetObject(
	ctx context.Context,
	bucketName, objectName, filePath string,
	opts GetObjectOpts,
) error {
	sdkOpts := gnfdsdktypes.GetObjectOptions{
		Range: opts.Range,
	}

	err := c.gnfdClient.FGetObject(ctx, bucketName, objectName, filePath, sdkOpts)
	if err != nil {
		return fmt.Errorf("fget object %s/%s to %s: %w", bucketName, objectName, filePath, err)
	}

	return nil
}

// FGetObjectResumable downloads an object with resume support.
func (c *client) FGetObjectResumable(
	ctx context.Context,
	bucketName, objectName, filePath string,
	opts GetObjectOpts,
) error {
	sdkOpts := gnfdsdktypes.GetObjectOptions{
		Range: opts.Range,
	}

	err := c.gnfdClient.FGetObjectResumable(ctx, bucketName, objectName, filePath, sdkOpts)
	if err != nil {
		return fmt.Errorf("fget resumable %s/%s to %s: %w", bucketName, objectName, filePath, err)
	}

	return nil
}
