package parser

import (
	"fmt"
	"strconv"
	"strings"

	greenfieldclient "github.com/AudiusProject/ion/packages/greenfield-client"
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

// ExtractCreateObjectEvent parses a CreateObjectEvent from ABCI event attributes.
func ExtractCreateObjectEvent(
	txEvent *greenfieldclient.TxEvent,
	abciEvent greenfieldclient.ABCIEvent,
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
	txEvent *greenfieldclient.TxEvent,
	abciEvent greenfieldclient.ABCIEvent,
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
