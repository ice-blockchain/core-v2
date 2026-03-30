package adnl

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync/atomic"
	"time"

	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/middleware"
	"ion-greenfield-proxy/internal/stun"

	"github.com/gin-gonic/gin"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/adnl/rldp"
)

// Listener accepts ADNL/RLDP connections and dispatches HTTP-over-RLDP
// requests through the Gin engine. The entire middleware and handler
// stack is shared with the TCP transport.
type Listener struct {
	ctx            context.Context
	key            *Key
	engine         *gin.Engine
	logger         *slog.Logger
	gate           *adnl.Gateway
	cancel         context.CancelFunc
	payloads       *xsync.Map[string, *spooledPayload]
	externalAddr   string
	tmpDir         string
	port           int
	pendingSize    atomic.Int64
	maxPendingSize int64
}

func NewListener(cfg *config.Config, key *Key, engine *gin.Engine, logger *slog.Logger) *Listener {
	return &Listener{
		key:            key,
		port:           cfg.Port,
		externalAddr:   cfg.ADNLExternalAddr,
		engine:         engine,
		logger:         logger,
		payloads:       xsync.NewMap[string, *spooledPayload](),
		maxPendingSize: defaultMaxPendingSize,
	}
}

// Start creates an ADNL gateway and begins accepting overlay connections.
func (l *Listener) Start(ctx context.Context) error {
	l.ctx, l.cancel = context.WithCancel(ctx)

	tmpDir, err := os.MkdirTemp("", "rldp-payloads-*")
	if err != nil {
		return fmt.Errorf("create temp directory: %w", err)
	}
	l.tmpDir = tmpDir

	l.gate = adnl.NewGateway(l.key.Private)

	l.gate.SetConnectionHandler(func(client adnl.Peer) error {
		return l.handlePeer(client)
	})

	listenAddr := fmt.Sprintf("0.0.0.0:%d", l.port)
	if err := l.gate.StartServer(listenAddr); err != nil {
		return fmt.Errorf("adnl gateway: %w", err)
	}

	l.resolveAndSetAddress()

	addrList := l.gate.GetAddressList()
	if len(addrList.Addresses) > 0 {
		a := addrList.Addresses[0]
		l.logger.Info("adnl listener started",
			"adnl_address", l.key.Address,
			"adnl_public_key", hex.EncodeToString(l.key.Public),
			"external_ip", a.IP.String(),
			"external_port", a.Port,
		)
	} else {
		l.logger.Info("adnl listener started",
			"adnl_address", l.key.Address,
			"adnl_public_key", hex.EncodeToString(l.key.Public),
			"external_ip", "unknown",
		)
	}

	go l.reapStalePayloads()

	return nil
}

func (l *Listener) resolveAndSetAddress() {
	ip, port, err := l.resolveExternalAddr()
	if err != nil {
		l.logger.Warn("could not determine external address — DHT publishing will be skipped", "error", err)
		return
	}

	l.gate.SetAddressList([]*address.UDP{
		{IP: ip, Port: int32(port)},
	})
	l.logger.Info("ADNL external address set", "ip", ip.String(), "port", port)
}

func (l *Listener) resolveExternalAddr() (net.IP, int, error) {
	if l.externalAddr != "" {
		host, portStr, err := net.SplitHostPort(l.externalAddr)
		if err != nil {
			return nil, 0, fmt.Errorf("parse ADNL_EXTERNAL_ADDR: %w", err)
		}
		ip := net.ParseIP(host)
		if ip == nil {
			return nil, 0, fmt.Errorf("ADNL_EXTERNAL_ADDR: invalid IP %q", host)
		}
		port, err := net.LookupPort("udp", portStr)
		if err != nil {
			return nil, 0, fmt.Errorf("ADNL_EXTERNAL_ADDR: invalid port %q", portStr)
		}
		return ip.To4(), port, nil
	}

	l.logger.Info("ADNL_EXTERNAL_ADDR not set — detecting IP via STUN")
	ip, err := stun.DetectExternalIP(5 * time.Second)
	if err != nil {
		return nil, 0, fmt.Errorf("STUN detection failed: %w", err)
	}
	return ip, l.port, nil
}

// Gateway returns the underlying ADNL gateway, needed by the DHT publisher.
func (l *Listener) Gateway() *adnl.Gateway {
	return l.gate
}

// Stop cancels in-flight requests, cleans up spooled payloads, and closes the gateway.
func (l *Listener) Stop() error {
	if l.cancel != nil {
		l.cancel()
	}
	l.payloads.Range(func(key string, sp *spooledPayload) bool {
		sp.Close()
		l.payloads.Delete(key)
		return true
	})
	if l.tmpDir != "" {
		os.RemoveAll(l.tmpDir)
	}
	if l.gate != nil {
		l.gate.Close()
	}
	return nil
}

func (l *Listener) handlePeer(peer adnl.Peer) error {
	peerAddr := hex.EncodeToString(peer.GetID())
	l.logger.Debug("adnl peer connected", "peer", peerAddr)

	rl := rldp.NewClientV2(peer)

	peer.SetQueryHandler(func(query *adnl.MessageQuery) error {
		switch query.Data.(type) {
		case GetCapabilities:
			return peer.Answer(l.ctx, query.ID, &Capabilities{Value: capabilityRLDP2})
		}
		return nil
	})

	rl.SetOnQuery(func(transferID []byte, query *rldp.Query) error {
		switch req := query.Data.(type) {
		case Request:
			// Must run async: the gateway listen goroutine is single-threaded,
			// and fetchRequestBody sends RLDP queries back to the client that
			// need this same goroutine to process their responses.
			go func() {
				if err := l.handleHTTPRequest(rl, query, transferID, req, peerAddr); err != nil {
					l.logger.Error("adnl: handle request", "error", err)
				}
			}()
			return nil
		case GetNextPayloadPart:
			return l.handlePayloadPart(rl, query, transferID, req)
		}
		return fmt.Errorf("unknown query type: %T", query.Data)
	})

	return nil
}

func (l *Listener) handleHTTPRequest(
	rl *rldp.RLDP, query *rldp.Query, transferID []byte,
	req Request, peerAddr string,
) error {
	if l.pendingSize.Load() >= l.maxPendingSize {
		l.logger.Warn("pending payload size limit reached, rejecting request",
			"peer", peerAddr,
			"pending_size", l.pendingSize.Load(),
			"max_pending_size", l.maxPendingSize,
		)
		resp := Response{
			Version:    "HTTP/1.1",
			StatusCode: int32(http.StatusServiceUnavailable),
			Reason:     http.StatusText(http.StatusServiceUnavailable),
			NoPayload:  true,
		}
		return rl.SendAnswer(l.ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, &resp)
	}

	httpReq, err := BuildHTTPRequest(req)
	if err != nil {
		l.logger.Error("adnl: bad request", "error", err)
		return err
	}

	if cl := httpReq.Header.Get("Content-Length"); cl != "" {
		if n, _ := strconv.ParseInt(cl, 10, 64); n > 0 {
			body, size, err := l.fetchRequestBody(rl, req.ID)
			if err != nil {
				l.logger.Error("adnl: fetch request body", "error", err)
				return err
			}
			defer body.Close()
			httpReq.Body = body
			httpReq.ContentLength = size
		}
	}

	httpReq.Header.Set("X-ADNL-Address", peerAddr)
	httpReq.Header.Set("X-ADNL-RLDP-ID", hex.EncodeToString(transferID))

	w := newResponseWriter(l.tmpDir)
	l.engine.ServeHTTP(w, httpReq)

	resp := BuildTLResponse(w)

	if w.written > 0 {
		sp := newSpooledPayload(&w.spoolWriter)
		l.payloads.Store(hex.EncodeToString(req.ID), sp)
		l.pendingSize.Add(sp.size)
	}

	return rl.SendAnswer(l.ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, &resp)
}

func (l *Listener) handlePayloadPart(rl *rldp.RLDP, query *rldp.Query, transferID []byte, req GetNextPayloadPart) error {
	reqID := hex.EncodeToString(req.ID)
	payload, ok := l.payloads.Load(reqID)
	if !ok {
		return rl.SendAnswer(l.ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID,
			&PayloadPart{IsLast: true})
	}

	chunk, isLast := payload.ReadChunk(int(req.Seqno))

	if isLast {
		l.payloads.Delete(reqID)
		l.pendingSize.Add(-payload.size)
		payload.Close()
	}

	return rl.SendAnswer(l.ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID,
		&PayloadPart{Data: chunk, IsLast: isLast})
}

// fetchRequestBody retrieves the request body from the client by sending
// GetNextPayloadPart queries back over RLDP.
func (l *Listener) fetchRequestBody(rl *rldp.RLDP, reqID []byte) (io.ReadCloser, int64, error) {
	sw := spoolWriter{prefix: "rldp-reqbody-*", dir: l.tmpDir}
	for seqno := int32(0); ; seqno++ {
		var part PayloadPart
		err := rl.DoQuery(l.ctx, rldpMaxAnswerSize, GetNextPayloadPart{
			ID:           reqID,
			Seqno:        seqno,
			MaxChunkSize: int32(chunkSize),
		}, &part)
		if err != nil {
			sw.Close()
			return nil, 0, fmt.Errorf("fetch payload seqno %d: %w", seqno, err)
		}
		if _, err := sw.Write(part.Data); err != nil {
			sw.Close()
			return nil, 0, fmt.Errorf("spool request body: %w", err)
		}
		if part.IsLast {
			break
		}
	}
	return sw.toReadCloser()
}

// BuildHTTPRequest converts a TL Request into a standard *http.Request.
func BuildHTTPRequest(req Request) (*http.Request, error) {
	httpReq, err := http.NewRequest(req.Method, req.URL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	for _, h := range req.Headers {
		httpReq.Header.Add(h.Name, h.Value)
	}
	return httpReq, nil
}

// BuildTLResponse converts a captured ResponseWriter into a TL Response.
func BuildTLResponse(w *ResponseWriter) Response {
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
		NoPayload:  w.written == 0,
	}
}

// PayloadChunk extracts the chunk for the given seqno from body.
func PayloadChunk(body []byte, seqno int) (chunk []byte, isLast bool) {
	offset := seqno * chunkSize
	if offset >= len(body) {
		return nil, true
	}
	end := offset + chunkSize
	if end >= len(body) {
		return body[offset:], true
	}
	return body[offset:end], false
}

// ResponseWriter captures an HTTP response for RLDP serialization.
// Small bodies stay in memory; large bodies are spooled to temporary files.
type ResponseWriter struct {
	headers http.Header
	spoolWriter
	code int
}

// NewResponseWriter creates a ResponseWriter that spools to the system temp dir.
// Prefer newResponseWriter with a dedicated dir for production use.
func NewResponseWriter() *ResponseWriter {
	return newResponseWriter("")
}

func newResponseWriter(tmpDir string) *ResponseWriter {
	return &ResponseWriter{
		code:        http.StatusOK,
		headers:     make(http.Header),
		spoolWriter: spoolWriter{prefix: "rldp-resp-*", dir: tmpDir},
	}
}

func (w *ResponseWriter) Header() http.Header  { return w.headers }
func (w *ResponseWriter) WriteHeader(code int) { w.code = code }

const (
	payloadTTL            = 5 * time.Minute
	defaultMaxPendingSize = 5 << 30 // 5 GB total pending payload cap
)

// reapStalePayloads periodically removes payloads that have not been fully
// fetched within payloadTTL (e.g. because the client disconnected).
func (l *Listener) reapStalePayloads() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-l.ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			l.payloads.Range(func(key string, sp *spooledPayload) bool {
				if now.Sub(sp.createdAt) > payloadTTL {
					l.payloads.Delete(key)
					l.pendingSize.Add(-sp.size)
					sp.Close()
					l.logger.Debug("reaped stale payload", "id", key)
				}
				return true
			})
		}
	}
}

// ADNLContextMiddleware reads ADNL headers injected by the listener
// and sets them as Gin context values for the logger middleware.
func ADNLContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if addr := c.GetHeader("X-ADNL-Address"); addr != "" {
			c.Set(middleware.ContextKeyADNLAddress, addr)
			c.Request.Header.Del("X-ADNL-Address")
		}
		if rldpID := c.GetHeader("X-ADNL-RLDP-ID"); rldpID != "" {
			c.Set(middleware.ContextKeyADNLRLDPID, rldpID)
			c.Request.Header.Del("X-ADNL-RLDP-ID")
		}
		c.Next()
	}
}
