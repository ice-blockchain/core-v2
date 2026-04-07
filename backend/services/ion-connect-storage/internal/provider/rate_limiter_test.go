package provider

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func testRouter(rl *PeerRateLimiter) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/test", rl.Middleware(), func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})
	return r
}

func TestRateLimiterAllowsNormalTraffic(t *testing.T) {
	rl := NewPeerRateLimiter(100, 10)
	router := testRouter(rl)

	for range 5 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-RLDP-Peer-ID", "peer-abc")
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
	}
}

func TestRateLimiterBlocksExcessiveRequests(t *testing.T) {
	rl := NewPeerRateLimiter(1, 2) // 1 req/s, burst 2
	router := testRouter(rl)

	// First 2 requests succeed (burst).
	for range 2 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-RLDP-Peer-ID", "peer-flood")
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
	}

	// Third request exceeds burst.
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-RLDP-Peer-ID", "peer-flood")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestRateLimiterAllowsWithoutPeerHeader(t *testing.T) {
	rl := NewPeerRateLimiter(1, 1)
	router := testRouter(rl)

	// No peer header -- should pass through without rate limiting.
	for range 5 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
	}
}

func TestRateLimiterIsolatesPeers(t *testing.T) {
	rl := NewPeerRateLimiter(1, 1)
	router := testRouter(rl)

	// Exhaust peer-A's budget.
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-RLDP-Peer-ID", "peer-a")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-RLDP-Peer-ID", "peer-a")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusTooManyRequests, w.Code)

	// Peer-B should still be allowed.
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-RLDP-Peer-ID", "peer-b")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
}
