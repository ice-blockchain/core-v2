package adnl

import (
	"context"
	"net/http"
	"testing"
	"testing/synctest"
	"time"

	"ion-greenfield-proxy/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestBuildHTTPRequest_convertsMethodURLHeaders(t *testing.T) {
	t.Parallel()
	req := Request{
		ID:      make([]byte, 32),
		Method:  "POST",
		URL:     "https://example.com/api/v1/data",
		Version: "HTTP/1.1",
		Headers: []Header{
			{Name: "Content-Type", Value: "application/json"},
			{Name: "Authorization", Value: "Bearer token123"},
		},
	}

	httpReq, err := BuildHTTPRequest(req)
	require.NoError(t, err)
	require.Equal(t, "POST", httpReq.Method)
	require.Equal(t, "https://example.com/api/v1/data", httpReq.URL.String())
	require.Equal(t, "application/json", httpReq.Header.Get("Content-Type"))
	require.Equal(t, "Bearer token123", httpReq.Header.Get("Authorization"))
}

func TestBuildHTTPRequest_rejectsInvalidURL(t *testing.T) {
	t.Parallel()
	_, err := BuildHTTPRequest(Request{Method: "GET", URL: "://"})
	require.Error(t, err)
}

func TestBuildHTTPRequest_multipleValuesForSameHeader(t *testing.T) {
	t.Parallel()
	req := Request{
		ID:      make([]byte, 32),
		Method:  "GET",
		URL:     "/test",
		Version: "HTTP/1.1",
		Headers: []Header{
			{Name: "Accept", Value: "text/html"},
			{Name: "Accept", Value: "application/json"},
		},
	}

	httpReq, err := BuildHTTPRequest(req)
	require.NoError(t, err)
	values := httpReq.Header.Values("Accept")
	require.Len(t, values, 2)
	require.Contains(t, values, "text/html")
	require.Contains(t, values, "application/json")
}

func TestBuildTLResponse_convertsStatusHeadersAndPayloadFlag(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	w.Write([]byte(`{"ok":true}`))

	resp := BuildTLResponse(w)
	require.Equal(t, int32(201), resp.StatusCode)
	require.Equal(t, "Created", resp.Reason)
	require.False(t, resp.NoPayload)
	require.Contains(t, resp.Headers, Header{Name: "Content-Type", Value: "application/json"})
}

func TestBuildTLResponse_noPayloadWhenBodyEmpty(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.WriteHeader(204)

	resp := BuildTLResponse(w)
	require.True(t, resp.NoPayload)
}

func TestPayloadChunk_singleChunk(t *testing.T) {
	t.Parallel()
	chunk, isLast := PayloadChunk([]byte("hello"), 0)
	require.Equal(t, "hello", string(chunk))
	require.True(t, isLast)
}

func TestPayloadChunk_multipleChunks(t *testing.T) {
	t.Parallel()
	body := make([]byte, chunkSize+100)
	for i := range body {
		body[i] = byte(i % 256)
	}

	c0, last0 := PayloadChunk(body, 0)
	require.Len(t, c0, chunkSize)
	require.False(t, last0)

	c1, last1 := PayloadChunk(body, 1)
	require.Len(t, c1, 100)
	require.True(t, last1)
}

func TestPayloadChunk_beyondEnd(t *testing.T) {
	t.Parallel()
	chunk, isLast := PayloadChunk([]byte("data"), 999)
	require.Nil(t, chunk)
	require.True(t, isLast)
}

func TestResponseWriter_capturesStatusAndBody(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Header().Set("X-Custom", "value")
	w.WriteHeader(418)
	w.Write([]byte("teapot"))

	require.Equal(t, 418, w.code)
	require.Equal(t, "teapot", w.buf.String())
	require.Equal(t, "value", w.Header().Get("X-Custom"))
}

func TestResponseWriter_defaultsTo200(t *testing.T) {
	t.Parallel()
	w := NewResponseWriter()
	w.Write([]byte("ok"))
	require.Equal(t, http.StatusOK, w.code)
}

func TestADNLContextMiddleware_setsContextAndStripsHeaders(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	var gotAddr, gotRLDP, hdrAddr string

	r := gin.New()
	r.Use(ADNLContextMiddleware())
	r.GET("/t", func(c *gin.Context) {
		if v, ok := c.Get(middleware.ContextKeyADNLAddress); ok {
			gotAddr = v.(string)
		}
		if v, ok := c.Get(middleware.ContextKeyADNLRLDPID); ok {
			gotRLDP = v.(string)
		}
		hdrAddr = c.GetHeader("X-ADNL-Address")
		c.Status(200)
	})

	req, _ := http.NewRequest("GET", "/t", nil)
	req.Header.Set("X-ADNL-Address", "abc123")
	req.Header.Set("X-ADNL-RLDP-ID", "transfer456")

	w := NewResponseWriter()
	r.ServeHTTP(w, req)

	require.Equal(t, "abc123", gotAddr)
	require.Equal(t, "transfer456", gotRLDP)
	require.Empty(t, hdrAddr, "X-ADNL-Address header should be stripped")
}

func TestADNLContextMiddleware_noopWithoutHeaders(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	var hasAddr bool

	r := gin.New()
	r.Use(ADNLContextMiddleware())
	r.GET("/t", func(c *gin.Context) {
		_, hasAddr = c.Get(middleware.ContextKeyADNLAddress)
		c.Status(200)
	})

	req, _ := http.NewRequest("GET", "/t", nil)
	w := NewResponseWriter()
	r.ServeHTTP(w, req)

	require.False(t, hasAddr, "context should not have adnl_address for non-ADNL requests")
}

func TestReapStalePayloads_removesExpiredEntries(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		l := newTestListener(t)

		l.payloads.Store("old", &spooledPayload{
			mem:       []byte("data"),
			size:      4,
			createdAt: time.Now(),
		})

		go l.reapStalePayloads()

		// Advance past TTL + one reaper tick (30s) so the reaper fires after expiry
		time.Sleep(payloadTTL + 31*time.Second)

		_, exists := l.payloads.Load("old")
		if exists {
			t.Fatal("expected stale payload to be reaped")
		}
	})
}

func TestReapStalePayloads_keepsRecentEntries(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		l := newTestListener(t)

		go l.reapStalePayloads()

		// Let one tick pass, then add a fresh payload
		time.Sleep(31 * time.Second)

		l.payloads.Store("fresh", &spooledPayload{
			mem:       []byte("data"),
			size:      4,
			createdAt: time.Now(),
		})

		// Advance one more tick — payload is only ~30s old, well within TTL
		time.Sleep(31 * time.Second)

		_, exists := l.payloads.Load("fresh")
		if !exists {
			t.Fatal("expected fresh payload to survive")
		}
	})
}

func TestReapStalePayloads_stopsOnContextCancel(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		l := newTestListener(t)
		ctx, cancel := context.WithCancel(t.Context())
		l.ctx = ctx

		go l.reapStalePayloads()
		time.Sleep(31 * time.Second)
		cancel()

		l.payloads.Store("orphan", &spooledPayload{
			mem:       []byte("data"),
			size:      4,
			createdAt: time.Now().Add(-payloadTTL - time.Minute),
		})

		time.Sleep(31 * time.Second)

		_, exists := l.payloads.Load("orphan")
		if !exists {
			t.Fatal("reaper should have stopped — stale entry should remain")
		}
	})
}

func TestPendingSize_tracksStoreAndConsume(t *testing.T) {
	t.Parallel()
	l := newTestListener(t)

	sp1 := &spooledPayload{mem: make([]byte, 1000), size: 1000, createdAt: time.Now()}
	sp2 := &spooledPayload{mem: make([]byte, 2000), size: 2000, createdAt: time.Now()}

	l.payloads.Store("req0", sp1)
	l.pendingSize.Add(sp1.size)
	l.payloads.Store("req1", sp2)
	l.pendingSize.Add(sp2.size)

	require.Equal(t, int64(3000), l.pendingSize.Load())

	// Simulate handlePayloadPart completing a transfer
	if sp, ok := l.payloads.Load("req0"); ok {
		l.payloads.Delete("req0")
		l.pendingSize.Add(-sp.size)
	}
	require.Equal(t, int64(2000), l.pendingSize.Load())

	if sp, ok := l.payloads.Load("req1"); ok {
		l.payloads.Delete("req1")
		l.pendingSize.Add(-sp.size)
	}
	require.Equal(t, int64(0), l.pendingSize.Load())
}

func TestPendingSize_decrementedByReaper(t *testing.T) {
	t.Parallel()
	synctest.Test(t, func(t *testing.T) {
		l := newTestListener(t)

		sp := &spooledPayload{mem: []byte("x"), size: 500, createdAt: time.Now()}
		l.payloads.Store("stale", sp)
		l.pendingSize.Add(sp.size)

		go l.reapStalePayloads()

		time.Sleep(payloadTTL + 31*time.Second)

		if l.pendingSize.Load() != 0 {
			t.Fatalf("expected pendingSize=0 after reap, got %d", l.pendingSize.Load())
		}
	})
}

func TestHandleHTTPRequest_returns503WhenPendingSizeExceeded(t *testing.T) {
	t.Parallel()

	if testing.Short() {
		t.Skip("skipping RLDP e2e test in short mode")
	}

	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.GET("/big", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/octet-stream", make([]byte, 256))
	})

	env := startTestRLDPEnv(t, engine, func(l *Listener) {
		l.maxPendingSize = 100
	})

	// First request: response body (256 bytes) exceeds maxPendingSize (100).
	// Don't fetch payload parts — leave them pending.
	reqID1 := make([]byte, 32)
	reqID1[0] = 1
	var resp1 Response
	err := env.Client.DoQuery(env.Ctx, rldpMaxAnswerSize, Request{
		ID:      reqID1,
		Method:  http.MethodGet,
		URL:     "/big",
		Version: "HTTP/1.1",
	}, &resp1)
	require.NoError(t, err)
	require.EqualValues(t, http.StatusOK, resp1.StatusCode)
	require.False(t, resp1.NoPayload)

	// Second request: pending size is over the limit — expect 503.
	reqID2 := make([]byte, 32)
	reqID2[0] = 2
	var resp2 Response
	err = env.Client.DoQuery(env.Ctx, rldpMaxAnswerSize, Request{
		ID:      reqID2,
		Method:  http.MethodGet,
		URL:     "/big",
		Version: "HTTP/1.1",
	}, &resp2)
	require.NoError(t, err)
	require.EqualValues(t, http.StatusServiceUnavailable, resp2.StatusCode)
	require.True(t, resp2.NoPayload)

	// After consuming the first payload, new requests should succeed again.
	fetchRLDPResponseBody(t, env.Ctx, env.Client, reqID1)

	reqID3 := make([]byte, 32)
	reqID3[0] = 3
	var resp3 Response
	err = env.Client.DoQuery(env.Ctx, rldpMaxAnswerSize, Request{
		ID:      reqID3,
		Method:  http.MethodGet,
		URL:     "/big",
		Version: "HTTP/1.1",
	}, &resp3)
	require.NoError(t, err)
	require.EqualValues(t, http.StatusOK, resp3.StatusCode,
		"should accept requests again after pending payload is consumed")
}
