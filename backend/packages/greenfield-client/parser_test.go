package greenfieldclient

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExtractCreateObjectEvent_Valid(t *testing.T) {
	txEvent := &TxEvent{Height: 29331798, TxHash: "90B5A508"}
	abciEvent := ABCIEvent{
		Type: "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{
			"bucket_name":  "test-bucket",
			"object_name":  "test-object.json",
			"content_type": "application/json",
			"create_at":    "1774432372",
			"creator":      "0x65a16d60",
			"payload_size": "1024",
			"version":      "1",
			"checksums":    "abc123",
		},
	}

	result, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	require.NoError(t, err)
	require.Equal(t, "test-bucket", result.BucketName)
	require.Equal(t, "test-object.json", result.ObjectName)
	require.Equal(t, uint64(1024), result.PayloadSize)
}

func TestExtractCreateObjectEvent_MissingBucket(t *testing.T) {
	txEvent := &TxEvent{Height: 100, TxHash: "abc"}
	abciEvent := ABCIEvent{
		Type:       "greenfield.storage.EventCreateObject",
		Attributes: map[string]string{"object_name": "obj"},
	}
	_, err := ExtractCreateObjectEvent(txEvent, abciEvent)
	require.ErrorContains(t, err, "missing bucket_name")
}

func TestExtractSetTagEvent_Valid(t *testing.T) {
	abciEvent := ABCIEvent{
		Type: "greenfield.storage.EventSetTag",
		Attributes: map[string]string{
			"resource": "grn:o::user-bucket10/test-object",
			"tags":     `{"tags":[{"key":"ion-env","value":"dev"},{"key":"ion-bag-id","value":"bb5b3a4bd4775cc5f89b2f2c80ec8c699662b26c2ab475248d721ed381ab3423"}]}`,
		},
	}

	result, err := ExtractSetTagEvent(abciEvent)
	require.NoError(t, err)
	require.Equal(t, "user-bucket10", result.BucketName)
	require.Equal(t, "test-object", result.ObjectName)
	require.Len(t, result.Tags, 2)
	require.Equal(t, "ion-bag-id", result.Tags[1].Key)
	require.Equal(t, "bb5b3a4bd4775cc5f89b2f2c80ec8c699662b26c2ab475248d721ed381ab3423", result.Tags[1].Value)
}

func TestExtractSetTagEvent_MissingResource(t *testing.T) {
	abciEvent := ABCIEvent{
		Type:       "greenfield.storage.EventSetTag",
		Attributes: map[string]string{"tags": `{"tags":[]}`},
	}
	_, err := ExtractSetTagEvent(abciEvent)
	require.ErrorContains(t, err, "missing resource")
}

func TestExtractSetTagEvent_InvalidTagsJSON(t *testing.T) {
	abciEvent := ABCIEvent{
		Type: "greenfield.storage.EventSetTag",
		Attributes: map[string]string{
			"resource": "grn:o::bucket/obj",
			"tags":     "not-json",
		},
	}
	_, err := ExtractSetTagEvent(abciEvent)
	require.ErrorContains(t, err, "parse tags JSON")
}

func TestParseObjectGRN_Valid(t *testing.T) {
	bucket, object, ok := ParseObjectGRN("grn:o::mybucket/myobject")
	require.True(t, ok)
	require.Equal(t, "mybucket", bucket)
	require.Equal(t, "myobject", object)
}

func TestParseObjectGRN_NestedPath(t *testing.T) {
	bucket, object, ok := ParseObjectGRN("grn:o::mybucket/path/to/object")
	require.True(t, ok)
	require.Equal(t, "mybucket", bucket)
	require.Equal(t, "path/to/object", object)
}

func TestParseObjectGRN_BucketResource(t *testing.T) {
	_, _, ok := ParseObjectGRN("grn:b::mybucket")
	require.False(t, ok)
}

func TestParseObjectGRN_Empty(t *testing.T) {
	_, _, ok := ParseObjectGRN("")
	require.False(t, ok)
}

func TestParseObjectGRN_NoSlash(t *testing.T) {
	_, _, ok := ParseObjectGRN("grn:o::bucketonly")
	require.False(t, ok)
}

func TestBagIndexQuery_Valid(t *testing.T) {
	q := BagIndexQuery("dev")
	require.Contains(t, q, "CONTAINS 'dev'")
	require.Contains(t, q, "CONTAINS 'ion-bag-id'")
	require.Contains(t, q, "tm.event='Tx'")
}

func TestBagIndexQuery_InvalidEnv(t *testing.T) {
	require.Panics(t, func() { BagIndexQuery("INVALID!") })
}
