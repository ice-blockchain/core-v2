package greenfieldclient

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// CreateObjectEvent holds parsed fields from EventCreateObject.
type CreateObjectEvent struct {
	BlockHeight int64    `json:"block_height"`
	TxHash      string   `json:"tx_hash"`
	BucketName  string   `json:"bucket_name"`
	ContentType string   `json:"content_type"`
	CreateAt    int64    `json:"create_at"`
	Creator     string   `json:"creator"`
	ObjectName  string   `json:"object_name"`
	PayloadSize uint64   `json:"payload_size"`
	Checksums   []string `json:"checksums"`
	Version     int64    `json:"version"`
}

// UpdateObjectContentEvent holds parsed fields from EventUpdateObjectContent.
type UpdateObjectContentEvent struct {
	BlockHeight int64    `json:"block_height"`
	TxHash      string   `json:"tx_hash"`
	Operator    string   `json:"operator"`
	BucketName  string   `json:"bucket_name"`
	ObjectName  string   `json:"object_name"`
	PayloadSize uint64   `json:"payload_size"`
	Checksums   []string `json:"checksums"`
	Version     int64    `json:"version"`
}

// SetTagEvent holds parsed fields from EventSetTag.
type SetTagEvent struct {
	Resource   string
	BucketName string
	ObjectName string
	Tags       []TagEntry
}

// TagEntry is a single key-value tag from a Greenfield SetTag event.
type TagEntry struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// ExtractCreateObjectEvent parses a CreateObjectEvent from ABCI event attributes.
func ExtractCreateObjectEvent(
	txEvent *TxEvent,
	abciEvent ABCIEvent,
) (*CreateObjectEvent, error) {
	attrs := abciEvent.Attributes

	bucketName, ok := attrs["bucket_name"]
	if !ok {
		return nil, fmt.Errorf("missing bucket_name attribute")
	}

	objectName, ok := attrs["object_name"]
	if !ok {
		return nil, fmt.Errorf("missing object_name attribute")
	}

	createAt, err := parseOptionalInt64(attrs, "create_at")
	if err != nil {
		return nil, fmt.Errorf("parse create_at: %w", err)
	}

	payloadSize, err := parseOptionalUint64(attrs, "payload_size")
	if err != nil {
		return nil, fmt.Errorf("parse payload_size: %w", err)
	}

	version, err := parseOptionalInt64(attrs, "version")
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	return &CreateObjectEvent{
		BlockHeight: txEvent.Height,
		TxHash:      txEvent.TxHash,
		BucketName:  bucketName,
		ContentType: attrs["content_type"],
		CreateAt:    createAt,
		Creator:     attrs["creator"],
		ObjectName:  objectName,
		PayloadSize: payloadSize,
		Checksums:   parseChecksums(attrs["checksums"]),
		Version:     version,
	}, nil
}

// ExtractUpdateObjectContentEvent parses an UpdateObjectContentEvent.
func ExtractUpdateObjectContentEvent(
	txEvent *TxEvent,
	abciEvent ABCIEvent,
) (*UpdateObjectContentEvent, error) {
	attrs := abciEvent.Attributes

	bucketName, ok := attrs["bucket_name"]
	if !ok {
		return nil, fmt.Errorf("missing bucket_name attribute")
	}

	objectName, ok := attrs["object_name"]
	if !ok {
		return nil, fmt.Errorf("missing object_name attribute")
	}

	payloadSize, err := parseOptionalUint64(attrs, "payload_size")
	if err != nil {
		return nil, fmt.Errorf("parse payload_size: %w", err)
	}

	version, err := parseOptionalInt64(attrs, "version")
	if err != nil {
		return nil, fmt.Errorf("parse version: %w", err)
	}

	return &UpdateObjectContentEvent{
		BlockHeight: txEvent.Height,
		TxHash:      txEvent.TxHash,
		Operator:    attrs["operator"],
		BucketName:  bucketName,
		ObjectName:  objectName,
		PayloadSize: payloadSize,
		Checksums:   parseChecksums(attrs["checksums"]),
		Version:     version,
	}, nil
}

// ExtractSetTagEvent parses a SetTagEvent from ABCI event attributes.
// It extracts the resource GRN, parses bucket/object from it, and parses the tags JSON.
func ExtractSetTagEvent(abciEvent ABCIEvent) (*SetTagEvent, error) {
	attrs := abciEvent.Attributes

	resource, ok := attrs["resource"]
	if !ok {
		return nil, fmt.Errorf("missing resource attribute")
	}

	tagsRaw, ok := attrs["tags"]
	if !ok {
		return nil, fmt.Errorf("missing tags attribute")
	}

	var tagSet struct {
		Tags []TagEntry `json:"tags"`
	}
	if err := json.Unmarshal([]byte(tagsRaw), &tagSet); err != nil {
		return nil, fmt.Errorf("parse tags JSON: %w", err)
	}

	bucket, object, _ := ParseObjectGRN(resource)

	return &SetTagEvent{
		Resource:   resource,
		BucketName: bucket,
		ObjectName: object,
		Tags:       tagSet.Tags,
	}, nil
}

// ParseObjectGRN extracts bucket and object names from a Greenfield object GRN.
// Format: grn:o::<bucket>/<object>
// Returns empty strings and false for non-object GRNs.
func ParseObjectGRN(grn string) (bucket, object string, ok bool) {
	if !strings.HasPrefix(grn, "grn:o::") {
		return "", "", false
	}

	path := strings.TrimPrefix(grn, "grn:o::")
	idx := strings.IndexByte(path, '/')
	if idx < 0 {
		return "", "", false
	}

	return path[:idx], path[idx+1:], true
}

func parseOptionalInt64(attrs map[string]string, key string) (int64, error) {
	val, ok := attrs[key]
	if !ok || val == "" {
		return 0, nil
	}
	return strconv.ParseInt(val, 10, 64)
}

func parseOptionalUint64(attrs map[string]string, key string) (uint64, error) {
	val, ok := attrs[key]
	if !ok || val == "" {
		return 0, nil
	}
	return strconv.ParseUint(val, 10, 64)
}

func parseChecksums(raw string) []string {
	if raw == "" {
		return nil
	}
	return strings.Split(raw, ",")
}
