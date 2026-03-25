package parser

import (
	"testing"

	greenfieldclient "github.com/AudiusProject/ion/packages/greenfield-client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractCreateObjectEvent(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{
		Height: 29331798,
		TxHash: "90B5A5084BC255A37C222294D023883D4ED06E9A",
	}

	abciEvent := greenfieldclient.ABCIEvent{
		Type: "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{
			"bucket_name":  "test-bucket",
			"object_name":  "test-object.json",
			"content_type": "application/json",
			"create_at":    "1774432372",
			"creator":      "0x65a16d6052f597A137639B824f6667fE70D36173",
			"payload_size": "1024",
			"version":      "1",
			"checksums":    "abc123",
		},
	}

	result, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	require.NoError(t, err)

	assert.Equal(t, int64(29331798), result.BlockHeight)
	assert.Equal(t, "90B5A5084BC255A37C222294D023883D4ED06E9A", result.TxHash)
	assert.Equal(t, "test-bucket", result.BucketName)
	assert.Equal(t, "test-object.json", result.ObjectName)
	assert.Equal(t, "application/json", result.ContentType)
	assert.Equal(t, int64(1774432372), result.CreateAt)
	assert.Equal(t, "0x65a16d6052f597A137639B824f6667fE70D36173", result.Creator)
	assert.Equal(t, uint64(1024), result.PayloadSize)
	assert.Equal(t, int64(1), result.Version)
	assert.Equal(t, []string{"abc123"}, result.Checksums)
}

func TestExtractCreateObjectEvent_MissingBucketName(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{Height: 100, TxHash: "abc"}
	abciEvent := greenfieldclient.ABCIEvent{
		Type: "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{
			"object_name": "obj",
		},
	}

	_, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing bucket_name")
}

func TestExtractCreateObjectEvent_MissingObjectName(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{Height: 100, TxHash: "abc"}
	abciEvent := greenfieldclient.ABCIEvent{
		Type: "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{
			"bucket_name": "bucket",
		},
	}

	_, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing object_name")
}

func TestExtractCreateObjectEvent_InvalidPayloadSize(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{Height: 100, TxHash: "abc"}
	abciEvent := greenfieldclient.ABCIEvent{
		Type: "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{
			"bucket_name":  "bucket",
			"object_name":  "obj",
			"payload_size": "not-a-number",
		},
	}

	_, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "parse payload_size")
}

func TestExtractUpdateObjectContentEvent(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{
		Height: 29331800,
		TxHash: "DEADBEEF",
	}

	abciEvent := greenfieldclient.ABCIEvent{
		Type: "greenfield.storage.EventUpdateObjectContent",
		Attributes: map[string]string{
			"operator":     "0x89A1CC91B642DECbC478947469C606E0E0c420b",
			"bucket_name":  "my-bucket",
			"object_name":  "updated.json",
			"payload_size": "2048",
			"version":      "3",
			"checksums":    "def456",
		},
	}

	result, err := ExtractUpdateObjectContentEvent(txEvent, abciEvent)
	require.NoError(t, err)

	assert.Equal(t, int64(29331800), result.BlockHeight)
	assert.Equal(t, "DEADBEEF", result.TxHash)
	assert.Equal(t, "0x89A1CC91B642DECbC478947469C606E0E0c420b", result.Operator)
	assert.Equal(t, "my-bucket", result.BucketName)
	assert.Equal(t, "updated.json", result.ObjectName)
	assert.Equal(t, uint64(2048), result.PayloadSize)
	assert.Equal(t, int64(3), result.Version)
}

func TestExtractUpdateObjectContentEvent_MissingRequired(t *testing.T) {
	txEvent := &greenfieldclient.TxEvent{Height: 100, TxHash: "abc"}

	_, err := ExtractUpdateObjectContentEvent(txEvent, greenfieldclient.ABCIEvent{
		Type:       "greenfield.storage.EventUpdateObjectContent",
		Attributes: map[string]string{"object_name": "obj"},
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing bucket_name")

	_, err = ExtractUpdateObjectContentEvent(txEvent, greenfieldclient.ABCIEvent{
		Type:       "greenfield.storage.EventUpdateObjectContent",
		Attributes: map[string]string{"bucket_name": "bucket"},
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing object_name")
}

func TestParseOptionalInt64_EmptyValue(t *testing.T) {
	attrs := map[string]string{"key": ""}
	val, err := parseOptionalInt64(attrs, "key")
	require.NoError(t, err)
	assert.Equal(t, int64(0), val)
}

func TestParseOptionalInt64_Missing(t *testing.T) {
	attrs := map[string]string{}
	val, err := parseOptionalInt64(attrs, "missing")
	require.NoError(t, err)
	assert.Equal(t, int64(0), val)
}
