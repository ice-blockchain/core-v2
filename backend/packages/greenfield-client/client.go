package greenfieldclient

import (
	"context"
	"io"
)

// TxEvent represents a full transaction result from the websocket.
type TxEvent struct {
	Height int64
	TxHash string
	Events []ABCIEvent
}

// ABCIEvent is a single event from the transaction result.
type ABCIEvent struct {
	Type       string
	Attributes map[string]string
}

// SubscribeOpts configures the Subscribe call.
type SubscribeOpts struct {
	LastHeight int64
	Query      string
}

// GetObjectOpts configures object download calls.
type GetObjectOpts struct {
	Range string
}

// ObjectStat contains basic object metadata.
type ObjectStat struct {
	ObjectName  string
	ContentType string
	Size        int64
}

// Client is the public interface for interacting with BNB Greenfield.
type Client interface {
	Subscribe(ctx context.Context, opts SubscribeOpts) (<-chan *TxEvent, error)
	IsSubscribed() bool
	GetObject(ctx context.Context, bucketName, objectName string, opts GetObjectOpts) (io.ReadCloser, ObjectStat, error)
	FGetObject(ctx context.Context, bucketName, objectName, filePath string, opts GetObjectOpts) error
	FGetObjectResumable(ctx context.Context, bucketName, objectName, filePath string, opts GetObjectOpts) error
	Close() error
}
