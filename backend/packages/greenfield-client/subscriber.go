package greenfieldclient

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"sync/atomic"
	"time"

	rpchttp "github.com/cometbft/cometbft/rpc/client/http"
	ctypes "github.com/cometbft/cometbft/rpc/core/types"
)

const (
	maxBackoff       = 30 * time.Second
	initialBackoff   = 1 * time.Second
	catchUpBatchSize = 20
)

// Subscribe starts a reliable event subscription that handles catch-up
// and automatic reconnection with round-robin RPC failover.
func (c *client) Subscribe(ctx context.Context, opts SubscribeOpts) (<-chan *TxEvent, error) {
	query := opts.Query
	if query == "" {
		return nil, fmt.Errorf("subscribe: Query is required in SubscribeOpts")
	}

	ch := make(chan *TxEvent, 64)

	var lastHeight atomic.Int64
	if opts.LastHeight > 0 {
		lastHeight.Store(opts.LastHeight)
	}

	currentHeight, err := c.fetchCurrentHeight(ctx)
	if err != nil {
		close(ch)
		return nil, fmt.Errorf("fetch current height: %w", err)
	}

	if opts.LastHeight > 0 && opts.LastHeight < currentHeight {
		if err := c.catchUp(ctx, opts.LastHeight, currentHeight, ch); err != nil {
			close(ch)
			return nil, fmt.Errorf("initial catch-up: %w", err)
		}
		lastHeight.Store(currentHeight)
	}

	go c.subscribeLoop(ctx, query, &lastHeight, ch)

	return ch, nil
}

func (c *client) subscribeLoop(
	ctx context.Context,
	query string,
	lastHeight *atomic.Int64,
	ch chan<- *TxEvent,
) {
	defer close(ch)

	backoff := initialBackoff

	for {
		if ctx.Err() != nil {
			return
		}

		err := c.runSubscription(ctx, query, lastHeight, ch)
		if ctx.Err() != nil {
			return
		}

		if err != nil {
			c.log.Warn().Err(err).Dur("backoff", backoff).Msg("subscription error, reconnecting")
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}

		backoff = min(backoff*2, maxBackoff)

		if reconnErr := c.reconnectHTTP(); reconnErr != nil {
			c.log.Error().Err(reconnErr).Msg("reconnect http failed")
			continue
		}

		stored := lastHeight.Load()
		if stored > 0 {
			currentHeight, err := c.fetchCurrentHeight(ctx)
			if err != nil {
				c.log.Error().Err(err).Msg("fetch height for catch-up")
				continue
			}
			if stored+1 <= currentHeight {
				if err := c.catchUp(ctx, stored+1, currentHeight, ch); err != nil {
					c.log.Error().Err(err).Msg("catch-up after reconnect")
					continue
				}
				lastHeight.Store(currentHeight)
			}
		}

		backoff = initialBackoff
	}
}

func (c *client) runSubscription(
	ctx context.Context,
	query string,
	lastHeight *atomic.Int64,
	ch chan<- *TxEvent,
) error {
	url := c.currentRPC()
	wsClient, err := rpchttp.New(url, "/websocket")
	if err != nil {
		return fmt.Errorf("create ws client: %w", err)
	}

	if err := wsClient.Start(); err != nil {
		return fmt.Errorf("start ws client: %w", err)
	}
	defer func() {
		_ = wsClient.Stop()
	}()

	resCh, err := wsClient.Subscribe(ctx, "greenfield-client", query)
	if err != nil {
		return fmt.Errorf("subscribe: %w", err)
	}

	c.subscribed.Store(true)
	defer c.subscribed.Store(false)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case result, ok := <-resCh:
			if !ok {
				return fmt.Errorf("subscription channel closed")
			}
			txEvent, err := c.parseTxResult(result)
			if err != nil {
				c.log.Warn().Err(err).Msg("parse tx result")
				continue
			}
			if txEvent == nil {
				continue
			}

			c.log.Debug().
				Int64("height", txEvent.Height).
				Str("tx", txEvent.TxHash).
				Int("events", len(txEvent.Events)).
				Msg("received ws event")

			lastHeight.Store(txEvent.Height)

			select {
			case ch <- txEvent:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func (c *client) fetchCurrentHeight(ctx context.Context) (int64, error) {
	status, err := c.getHTTPClient().Status(ctx)
	if err != nil {
		return 0, fmt.Errorf("get status: %w", err)
	}
	return status.SyncInfo.LatestBlockHeight, nil
}

func (c *client) catchUp(
	ctx context.Context,
	fromHeight, toHeight int64,
	ch chan<- *TxEvent,
) error {
	for start := fromHeight; start <= toHeight; start += catchUpBatchSize {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		end := start + catchUpBatchSize - 1
		if end > toHeight {
			end = toHeight
		}

		for h := start; h <= end; h++ {
			if ctx.Err() != nil {
				return ctx.Err()
			}

			blockResults, err := c.getHTTPClient().BlockResults(ctx, &h)
			if err != nil {
				return fmt.Errorf("block results at %d: %w", h, err)
			}

			events := extractEventsFromBlockResults(h, blockResults)
			for _, txEvent := range events {
				select {
				case ch <- txEvent:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}
	}
	return nil
}

func extractEventsFromBlockResults(
	height int64,
	blockResults *ctypes.ResultBlockResults,
) []*TxEvent {
	var txEvents []*TxEvent

	for _, txResult := range blockResults.TxsResults {
		txEvent := &TxEvent{
			Height: height,
		}

		var relevantEvents []ABCIEvent
		for _, event := range txResult.Events {
			if isRelevantEventType(event.Type) {
				attrs := make(map[string]string)
				for _, attr := range event.Attributes {
					val := string(attr.Value)
					if unquoted, err := strconv.Unquote(val); err == nil {
						val = unquoted
					}
					attrs[string(attr.Key)] = val
				}
				relevantEvents = append(relevantEvents, ABCIEvent{
					Type:       event.Type,
					Attributes: attrs,
				})
			}
		}

		if len(relevantEvents) > 0 {
			txEvent.Events = relevantEvents
			txEvents = append(txEvents, txEvent)
		}
	}

	return txEvents
}

func isRelevantEventType(eventType string) bool {
	return eventType == "greenfield.storage.EventCreateObject" ||
		eventType == "greenfield.storage.EventUpdateObjectContent" ||
		eventType == "greenfield.storage.EventSetTag"
}

func (c *client) parseTxResult(result ctypes.ResultEvent) (*TxEvent, error) {
	raw, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("marshal result event: %w", err)
	}

	return ParseTxResponse(raw, result)
}

// ParseTxResponse parses a raw websocket JSON-RPC response into a TxEvent.
func ParseTxResponse(rawJSON []byte, result ctypes.ResultEvent) (*TxEvent, error) {
	txEvent := &TxEvent{}

	if txHash, ok := result.Events["tx.hash"]; ok && len(txHash) > 0 {
		txEvent.TxHash = txHash[0]
	}

	if heights, ok := result.Events["tx.height"]; ok && len(heights) > 0 {
		h, err := strconv.ParseInt(heights[0], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse height %q: %w", heights[0], err)
		}
		txEvent.Height = h
	}

	if result.Data != nil {
		dataJSON, err := json.Marshal(result.Data)
		if err != nil {
			return nil, fmt.Errorf("marshal event data: %w", err)
		}

		var txData struct {
			Height int64 `json:"height"`
			Result struct {
				Events []struct {
					Type       string `json:"type"`
					Attributes []struct {
						Key   string `json:"key"`
						Value string `json:"value"`
						Index bool   `json:"index"`
					} `json:"attributes"`
				} `json:"events"`
			} `json:"result"`
		}

		if err := json.Unmarshal(dataJSON, &txData); err == nil {
			if txData.Height != 0 && txEvent.Height == 0 {
				txEvent.Height = txData.Height
			}

			for _, event := range txData.Result.Events {
				attrs := make(map[string]string)
				for _, attr := range event.Attributes {
					val := attr.Value
					if unquoted, err := strconv.Unquote(val); err == nil {
						val = unquoted
					}
					attrs[attr.Key] = val
				}
				txEvent.Events = append(txEvent.Events, ABCIEvent{
					Type:       event.Type,
					Attributes: attrs,
				})
			}
		}
	}

	if txEvent.Height == 0 && len(txEvent.Events) == 0 {
		return nil, nil
	}

	return txEvent, nil
}

func min(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}
