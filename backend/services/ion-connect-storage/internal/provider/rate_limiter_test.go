package provider

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
	defer rl.Close()
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
	defer rl.Close()
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

func TestRateLimiterFallsBackToIPWithoutPeerHeader(t *testing.T) {
	rl := NewPeerRateLimiter(1, 2) // 1 req/s, burst 2
	defer rl.Close()
	router := testRouter(rl)

	// First 2 requests succeed (burst).
	for range 2 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
	}

	// Third request exceeds burst -- rate limited by IP.
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestRateLimiterIsolatesPeers(t *testing.T) {
	rl := NewPeerRateLimiter(1, 1)
	defer rl.Close()
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

func TestRateLimiterDoubleCloseNoPanic(t *testing.T) {
	rl := NewPeerRateLimiter(10, 5)
	rl.Close()
	rl.Close() // must not panic
}

func TestRateLimiterRejectsWhenMaxPeersReached(t *testing.T) {
	rl := NewPeerRateLimiter(100, 100)
	defer rl.Close()
	router := testRouter(rl)

	// Set peerCount to max to simulate saturation.
	rl.peerCount.Store(maxTrackedPeers)

	// Existing peer should still work.
	rl.peers.Store("ip:192.168.1.1", rl.newEntry(0))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	// New peer should be rejected.
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "10.0.0.1:5678"
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestCleanupDecrementsPeerCount(t *testing.T) {
	rl := NewPeerRateLimiter(100, 10)
	defer rl.Close()

	staleTime := time.Now().Add(-20 * time.Minute).Unix()
	freshTime := time.Now().Unix()

	rl.peers.Store("stale-peer", rl.newEntry(staleTime))
	rl.peers.Store("fresh-peer", rl.newEntry(freshTime))
	rl.peerCount.Store(2)

	// Simulate one cleanup tick.
	cutoff := time.Now().Add(-10 * time.Minute).Unix()
	rl.peers.Range(func(key, value any) bool {
		if value.(*peerEntry).lastAccess.Load() < cutoff {
			rl.peers.Delete(key)
			rl.peerCount.Add(-1)
		}
		return true
	})

	require.Equal(t, int64(1), rl.peerCount.Load())

	// Verify stale peer is gone, fresh peer remains.
	_, staleExists := rl.peers.Load("stale-peer")
	require.False(t, staleExists)
	_, freshExists := rl.peers.Load("fresh-peer")
	require.True(t, freshExists)
}
