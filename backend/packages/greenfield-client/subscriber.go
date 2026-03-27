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
	maxBackoff     = 30 * time.Second
	initialBackoff = 1 * time.Second
)

// Subscribe starts a reliable event subscription that handles catch-up
// and automatic reconnection with round-robin RPC failover.
// Catch-up runs after the websocket is connected so no blocks are missed
// between the catch-up and the live subscription.
func (c *client) Subscribe(ctx context.Context, opts SubscribeOpts) (<-chan *TxEvent, error) {
	if opts.Query == "" {
		return nil, fmt.Errorf("subscribe: Query is required in SubscribeOpts")
	}

	ch := make(chan *TxEvent, 64)

	var lastHeight atomic.Int64
	if opts.LastHeight > 0 {
		lastHeight.Store(opts.LastHeight)
	}

	go c.subscribeLoop(ctx, opts.Query, &lastHeight, ch)

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

		err := c.runSubscription(ctx, query, lastHeight, ch, &backoff)
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
		c.rotateGateway()
	}
}

func (c *client) runSubscription(
	ctx context.Context,
	query string,
	lastHeight *atomic.Int64,
	ch chan<- *TxEvent,
	backoff *time.Duration,
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
	*backoff = initialBackoff

	// Catch-up AFTER websocket is subscribed. Events arriving during catch-up
	// are buffered in resCh. Duplicates are safe -- the ingester deduplicates
	// by job ID.
	if err := c.catchUpFromLastHeight(ctx, lastHeight, ch); err != nil {
		return fmt.Errorf("catch-up: %w", err)
	}

	return c.processEvents(ctx, resCh, lastHeight, ch)
}

func (c *client) catchUpFromLastHeight(
	ctx context.Context,
	lastHeight *atomic.Int64,
	ch chan<- *TxEvent,
) error {
	stored := lastHeight.Load()
	if stored <= 0 {
		return nil
	}

	currentHeight, err := c.fetchLatestHeight(ctx)
	if err != nil {
		return fmt.Errorf("fetch height: %w", err)
	}

	if stored >= currentHeight {
		return nil
	}

	if err := c.catchUp(ctx, stored+1, currentHeight, ch); err != nil {
		return fmt.Errorf("replay blocks %d-%d: %w", stored+1, currentHeight, err)
	}

	lastHeight.Store(currentHeight)
	return nil
}

func (c *client) processEvents(
	ctx context.Context,
	resCh <-chan ctypes.ResultEvent,
	lastHeight *atomic.Int64,
	ch chan<- *TxEvent,
) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case result, ok := <-resCh:
			if !ok {
				return fmt.Errorf("subscription channel closed")
			}
			txEvent, parseErr := parseTxResult(result)
			if parseErr != nil {
				c.log.Warn().Err(parseErr).Msg("parse tx result")
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

			if txEvent.Height > lastHeight.Load() {
				lastHeight.Store(txEvent.Height)
			}

			select {
			case ch <- txEvent:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func parseTxResult(result ctypes.ResultEvent) (*TxEvent, error) {
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
		parseEventData(result.Data, txEvent)
	}

	if txEvent.Height == 0 && len(txEvent.Events) == 0 {
		return nil, nil
	}

	return txEvent, nil
}

func parseEventData(data interface{}, txEvent *TxEvent) {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return
	}

	var txData struct {
		Height int64 `json:"height"`
		Result struct {
			Events []struct {
				Type       string `json:"type"`
				Attributes []struct {
					Key   string `json:"key"`
					Value string `json:"value"`
				} `json:"attributes"`
			} `json:"events"`
		} `json:"result"`
	}

	if err := json.Unmarshal(dataJSON, &txData); err != nil {
		return
	}

	if txData.Height != 0 && txEvent.Height == 0 {
		txEvent.Height = txData.Height
	}

	for _, event := range txData.Result.Events {
		attrs := make(map[string]string)
		for _, attr := range event.Attributes {
			val := attr.Value
			if unquoted, unqErr := strconv.Unquote(val); unqErr == nil {
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
