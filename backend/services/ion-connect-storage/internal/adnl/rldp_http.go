package adnl

import (
	"context"
	"encoding/hex"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

const (
	payloadTTL         = 30 * time.Second
	reaperInterval     = 10 * time.Second
	chunkSize          = 1 << 20
	maxPendingPayloads = 500
)

// RLDPHTTPBridge forwards HTTP-over-RLDP requests to a gin.Engine.
type RLDPHTTPBridge struct {
	engine       *gin.Engine
	logger       *slog.Logger
	payloads     *xsync.Map[string, *pendingPayload]
	payloadCount atomic.Int64
	cancel       context.CancelFunc
}

type pendingPayload struct {
	data      []byte
	createdAt time.Time
}

// NewRLDPHTTPBridge creates a bridge that routes RLDP HTTP requests
// through the given Gin engine. Starts a background reaper goroutine.
func NewRLDPHTTPBridge(ctx context.Context, engine *gin.Engine, logger *slog.Logger) *RLDPHTTPBridge {
	ctx, cancel := context.WithCancel(ctx)
	b := &RLDPHTTPBridge{
		engine:   engine,
		logger:   logger,
		payloads: xsync.NewMap[string, *pendingPayload](),
		cancel:   cancel,
	}
	go b.reapStalePayloads(ctx)
	return b
}

// Stop cancels the background reaper.
func (b *RLDPHTTPBridge) Stop() {
	b.cancel()
}

// MakeRLDPQueryHandler returns a handler for the overlay
// RLDPWrapper rootQueryHandler slot (non-overlay RLDP queries).
func (b *RLDPHTTPBridge) MakeRLDPQueryHandler(rl *overlay.RLDPWrapper) func([]byte, *rldp.Query) error {
	return func(transferID []byte, query *rldp.Query) (retErr error) {
		defer recoverPanic(b.logger, &retErr)
		switch req := query.Data.(type) {
		case Request:
			return b.handleHTTPRequest(rl, query, transferID, req)
		case GetNextPayloadPart:
			return b.handlePayloadPart(rl, query, transferID, req)
		}
		return nil
	}
}

func (b *RLDPHTTPBridge) handleHTTPRequest(
	rl *overlay.RLDPWrapper, query *rldp.Query, transferID []byte, req Request,
) error {
	httpReq, err := buildHTTPRequest(req)
	if err != nil {
		return fmt.Errorf("build http request: %w", err)
	}

	w := newResponseWriter()
	b.engine.ServeHTTP(w, httpReq)

	resp := buildTLResponse(w)
	reqID := hex.EncodeToString(req.ID)

	if w.body.Len() > 0 && b.tryReservePayloadSlot() {
		b.payloads.Store(reqID, &pendingPayload{
			data:      w.body.Bytes(),
			createdAt: time.Now(),
		})
		resp.NoPayload = false
	}

	answerCtx, answerCancel := context.WithDeadline(context.Background(), time.Unix(int64(query.Timeout), 0))
	defer answerCancel()
	return rl.SendAnswer(
		answerCtx,
		query.MaxAnswerSize, query.Timeout,
		query.ID, transferID, &resp,
	)
}

func (b *RLDPHTTPBridge) handlePayloadPart(
	rl *overlay.RLDPWrapper, query *rldp.Query, transferID []byte, req GetNextPayloadPart,
) error {
	answerCtx, answerCancel := context.WithDeadline(context.Background(), time.Unix(int64(query.Timeout), 0))
	defer answerCancel()

	reqID := hex.EncodeToString(req.ID)
	payload, ok := b.payloads.Load(reqID)
	if !ok || time.Since(payload.createdAt) > payloadTTL {
		if ok {
			b.deletePayload(reqID)
		}
		return rl.SendAnswer(
			answerCtx,
			query.MaxAnswerSize, query.Timeout,
			query.ID, transferID,
			&PayloadPart{IsLast: true},
		)
	}

	chunk, isLast := extractChunk(payload.data, int(req.Seqno))
	if isLast {
		b.deletePayload(reqID)
	}

	return rl.SendAnswer(
		answerCtx,
		query.MaxAnswerSize, query.Timeout,
		query.ID, transferID,
		&PayloadPart{Data: chunk, IsLast: isLast},
	)
}

// tryReservePayloadSlot atomically increments the payload counter if below the limit.
func (b *RLDPHTTPBridge) tryReservePayloadSlot() bool {
	for {
		current := b.payloadCount.Load()
		if current >= maxPendingPayloads {
			return false
		}
		if b.payloadCount.CompareAndSwap(current, current+1) {
			return true
		}
	}
}

// deletePayload atomically removes a payload and decrements the counter.
func (b *RLDPHTTPBridge) deletePayload(reqID string) {
	if _, loaded := b.payloads.LoadAndDelete(reqID); loaded {
		b.payloadCount.Add(-1)
	}
}

func (b *RLDPHTTPBridge) reapStalePayloads(ctx context.Context) {
	ticker := time.NewTicker(reaperInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			b.payloads.Range(func(key string, p *pendingPayload) bool {
				if now.Sub(p.createdAt) > payloadTTL {
					b.deletePayload(key)
				}
				return true
			})
		}
	}
}

const (
	maxURLLength    = 16 * 1024 // 16 KB
	maxMethodLength = 32
	maxHeaderCount  = 100
	maxHeaderSize   = 8192 // 8 KB per header name+value
)

func buildHTTPRequest(req Request) (*http.Request, error) {
	if len(req.URL) > maxURLLength {
		return nil, fmt.Errorf("URL too long: %d bytes", len(req.URL))
	}
	if len(req.Method) > maxMethodLength {
		return nil, fmt.Errorf("method too long: %d bytes", len(req.Method))
	}
	if len(req.Headers) > maxHeaderCount {
		return nil, fmt.Errorf("too many headers: %d", len(req.Headers))
	}
	// RLDP-HTTP operates over ADNL: only relative paths are valid.
	// Reject absolute URLs to prevent SSRF via scheme://host targets.
	if !strings.HasPrefix(req.URL, "/") {
		return nil, fmt.Errorf("URL must be a relative path: %q", req.URL)
	}
	if strings.Contains(req.URL, "://") {
		return nil, fmt.Errorf("URL must not contain a scheme: %q", req.URL)
	}
	httpReq, err := http.NewRequest(req.Method, req.URL, nil)
	if err != nil {
		return nil, err
	}
	for _, h := range req.Headers {
		if len(h.Name)+len(h.Value) > maxHeaderSize {
			return nil, fmt.Errorf("header too large: %d bytes", len(h.Name)+len(h.Value))
		}
		httpReq.Header.Add(h.Name, h.Value)
	}
	return httpReq, nil
}

func buildTLResponse(w *responseWriter) Response {
	headers := make([]Header, 0, len(w.headers))
	for name, values := range w.headers {
		for _, v := range values {
			headers = append(headers, Header{Name: name, Value: v})
		}
	}
	return Response{
		Version:    "HTTP/1.1",
		StatusCode: int32(w.code),
		Reason:     http.StatusText(w.code),
		Headers:    headers,
		NoPayload:  w.body.Len() == 0,
	}
}

func extractChunk(data []byte, seqno int) ([]byte, bool) {
	if seqno < 0 || seqno > math.MaxInt/chunkSize {
		return nil, true
	}
	offset := seqno * chunkSize
	if offset >= len(data) {
		return nil, true
	}
	end := offset + chunkSize
	if end >= len(data) {
		return data[offset:], true
	}
	return data[offset:end], false
}
