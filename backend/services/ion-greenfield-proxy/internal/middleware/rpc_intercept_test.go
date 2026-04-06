package middleware

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"ion-greenfield-proxy/internal/rpcbody"
)

var spQueryBody = []byte(`{"jsonrpc":"2.0","id":1,"method":"abci_query","params":{"path":"/greenfield.sp.Query/StorageProviders","data":"","height":"0","prove":false}}`)

// TestInterceptStorageProviders_TimeoutsOnHangingUpstream verifies that
// interceptStorageProviders does not block indefinitely when the upstream
// RPC endpoint never responds.
//
// NOTE: testing/synctest was considered but cannot be used here —
// http.Transport's internal goroutines involve non-durable blocking
// (net.Conn I/O) that prevents synctest from advancing the fake clock.
// Instead we set a short parent-context deadline so the effective
// timeout is min(parent, 30s) = 100ms.
func TestInterceptStorageProviders_TimeoutsOnHangingUpstream(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	// Server that accepts requests but never writes a response.
	hang := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-hang
	}))
	defer upstream.Close()
	defer close(hang)

	// Short parent context: interceptStorageProviders creates
	// context.WithTimeout(parent, 30s), so the effective deadline
	// is min(100ms, 30s) = 100ms.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(spQueryBody))
	c.Request = req.WithContext(ctx)
	c.Request.Header.Set("Content-Type", "application/json")

	parsed := &rpcbody.Body{
		Raw:      spQueryBody,
		Method:   "abci_query",
		ABCIPath: "/greenfield.sp.Query/StorageProviders",
	}
	parsed.Store(c)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	start := time.Now()
	interceptStorageProviders(logger, upstream.URL, "test-adnl", c, parsed)
	elapsed := time.Since(start)

	// The function must return after the context deadline, not hang.
	require.Less(t, elapsed, 5*time.Second,
		"interceptStorageProviders should return when context expires, not block indefinitely")
}

// TestInterceptStorageProviders_SuccessForwardsResponse verifies that a
// successful upstream response is forwarded to the client and the
// request is aborted so it doesn't reach the default proxy handler.
func TestInterceptStorageProviders_SuccessForwardsResponse(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Return a valid JSON-RPC envelope. The ABCI value is not valid
		// protobuf, so rewriteSPEndpoints will log an error and return
		// the body unchanged — good enough to verify forwarding.
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":{"response":{"value":"dGVzdA=="}}}`))
	}))
	defer upstream.Close()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(spQueryBody))
	c.Request.Header.Set("Content-Type", "application/json")

	parsed := &rpcbody.Body{
		Raw:      spQueryBody,
		Method:   "abci_query",
		ABCIPath: "/greenfield.sp.Query/StorageProviders",
	}
	parsed.Store(c)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	interceptStorageProviders(logger, upstream.URL, "test-adnl", c, parsed)

	require.Equal(t, http.StatusOK, w.Code)
	require.NotEmpty(t, w.Body.Bytes())
	require.True(t, c.IsAborted(), "handler must abort after writing response")
}
