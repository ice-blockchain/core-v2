package greenfieldclient

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/akuity/grpc-gateway-client/pkg/grpc/gateway"
)

const (
	msgTypeCreateObject        = "/greenfield.storage.MsgCreateObject"
	msgTypeUpdateObjectContent = "/greenfield.storage.MsgUpdateObjectContent"

	eventTypeCreateObject        = "greenfield.storage.EventCreateObject"
	eventTypeUpdateObjectContent = "greenfield.storage.EventUpdateObjectContent"
)

func (c *client) catchUp(
	ctx context.Context,
	fromHeight, toHeight int64,
	ch chan<- *TxEvent,
) error {
	for h := fromHeight; h <= toHeight; h++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		events, err := c.catchUpBlock(ctx, h)
		if err != nil {
			return fmt.Errorf("block %d: %w", h, err)
		}

		for _, ev := range events {
			select {
			case ch <- ev:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
	return nil
}

func (c *client) catchUpBlock(ctx context.Context, height int64) ([]*TxEvent, error) {
	req := c.getGwClient().NewRequest("GET", "/cosmos/tx/v1beta1/txs/block/{height}")
	req.SetPathParam("height", fmt.Sprintf("%d", height))

	resp, err := gateway.DoRequest[blockWithTxsResponse](ctx, req)
	if err != nil {
		return nil, fmt.Errorf("fetch block txs: %w", err)
	}

	return buildTxEventsFromBlock(height, resp)
}

func buildTxEventsFromBlock(height int64, resp *blockWithTxsResponse) ([]*TxEvent, error) {
	var txEvents []*TxEvent

	for i, tx := range resp.Txs {
		txHash, err := computeTxHash(resp.Block.Data.Txs, i)
		if err != nil {
			return nil, fmt.Errorf("tx %d: %w", i, err)
		}
		relevantEvents, err := extractEventsFromMessages(tx.Body.Messages)
		if err != nil {
			return nil, fmt.Errorf("tx %d: %w", i, err)
		}

		if len(relevantEvents) == 0 {
			continue
		}

		txEvents = append(txEvents, &TxEvent{
			Height: height,
			TxHash: txHash,
			Events: relevantEvents,
		})
	}

	return txEvents, nil
}

func computeTxHash(rawTxs [][]byte, index int) (string, error) {
	if index >= len(rawTxs) {
		return "", fmt.Errorf("tx index %d out of range (have %d raw txs)", index, len(rawTxs))
	}
	hash := sha256.Sum256(rawTxs[index])
	return fmt.Sprintf("%X", hash[:]), nil
}

func extractEventsFromMessages(messages []json.RawMessage) ([]ABCIEvent, error) {
	var events []ABCIEvent

	for _, raw := range messages {
		var msg txMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			return nil, fmt.Errorf("unmarshal tx message: %w", err)
		}

		abciEvent, ok := messageToABCIEvent(msg)
		if !ok {
			continue
		}
		events = append(events, abciEvent)
	}

	return events, nil
}

func messageToABCIEvent(msg txMessage) (ABCIEvent, bool) {
	attrs := make(map[string]string)

	switch msg.Type {
	case msgTypeCreateObject:
		attrs["bucket_name"] = msg.BucketName
		attrs["object_name"] = msg.ObjectName
		attrs["creator"] = msg.Creator
		attrs["content_type"] = msg.ContentType
		attrs["payload_size"] = msg.PayloadSize
		attrs["checksums"] = joinChecksums(msg.ExpectChecksums)
		attrs["create_at"] = msg.CreateAt
		attrs["version"] = msg.Version
		return ABCIEvent{Type: eventTypeCreateObject, Attributes: attrs}, true

	case msgTypeUpdateObjectContent:
		attrs["bucket_name"] = msg.BucketName
		attrs["object_name"] = msg.ObjectName
		attrs["operator"] = msg.Operator
		attrs["payload_size"] = msg.PayloadSize
		attrs["checksums"] = joinChecksums(msg.ExpectChecksums)
		attrs["version"] = msg.Version
		return ABCIEvent{Type: eventTypeUpdateObjectContent, Attributes: attrs}, true

	default:
		return ABCIEvent{}, false
	}
}

func joinChecksums(checksums []string) string {
	return strings.Join(checksums, ",")
}
