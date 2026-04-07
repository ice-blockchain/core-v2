package middleware_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func readCounter(c prometheus.Counter) float64 {
	m := &dto.Metric{}
	_ = c.(prometheus.Metric).Write(m)
	return m.GetCounter().GetValue()
}

func setupRateLimiter(t *testing.T, perKey, perIP, global int) (*gin.Engine, *middleware.MetricsCollectors, func()) {
	t.Helper()
	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)
	cfg := &config.Config{
		RateLimitPerKey: perKey,
		RateLimitPerIP:  perIP,
		RateLimitGlobal: global,
	}

	mw, stopCleanup := middleware.RateLimiter(discardLogger(), cfg, mc)

	r := gin.New()
	r.Use(mw)
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	return r, mc, stopCleanup
}

func setupWithSigner(t *testing.T, perKey, perIP, global int, signer string) (*gin.Engine, *middleware.MetricsCollectors, func()) {
	t.Helper()
	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)
	cfg := &config.Config{
		RateLimitPerKey: perKey,
		RateLimitPerIP:  perIP,
		RateLimitGlobal: global,
	}

	mw, stopCleanup := middleware.RateLimiter(discardLogger(), cfg, mc)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		if signer != "" {
			c.Set(middleware.ContextKeyTxSigner, signer)
		}
		c.Next()
	})
	r.Use(mw)
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	return r, mc, stopCleanup
}

func fireRequests(r *gin.Engine, n int, remoteAddr string) int {
	rejected := 0
	for i := 0; i < n; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = remoteAddr
		r.ServeHTTP(w, req)
		if w.Code == http.StatusTooManyRequests {
			rejected++
		}
	}
	return rejected
}

func TestGlobalLimitRejectsAfterQuota(t *testing.T) {
	t.Parallel()
	r, mc, stop := setupRateLimiter(t, 1000, 1000, 10)
	defer stop()

	rejected := fireRequests(r, 15, "192.168.1.1:12345")
	require.GreaterOrEqual(t, rejected, 3, "expected at least 3 rejections from global limit")
	require.GreaterOrEqual(t, readCounter(mc.RateLimitedGlobal), float64(3))
}

func TestIPLimitRejectsAfterQuota(t *testing.T) {
	t.Parallel()
	r, mc, stop := setupRateLimiter(t, 1000, 10, 10000)
	defer stop()

	rejected := fireRequests(r, 15, "192.168.1.1:12345")
	require.GreaterOrEqual(t, rejected, 3, "expected at least 3 rejections from IP limit")
	require.GreaterOrEqual(t, readCounter(mc.RateLimitedByIP), float64(3))
}

func TestKeyLimitRejectsAfterQuota(t *testing.T) {
	t.Parallel()
	r, mc, stop := setupWithSigner(t, 10, 10000, 10000, "0xABCDEF1234567890")
	defer stop()

	rejected := fireRequests(r, 15, "192.168.1.1:12345")
	require.GreaterOrEqual(t, rejected, 3, "expected at least 3 rejections from key limit")
	require.GreaterOrEqual(t, readCounter(mc.RateLimitedByUser), float64(3))
}

func TestNoSignerSkipsKeyCheck(t *testing.T) {
	t.Parallel()
	r, mc, stop := setupRateLimiter(t, 1, 10000, 10000)
	defer stop()

	rejected := fireRequests(r, 10, "192.168.1.1:12345")
	require.Equal(t, 0, rejected, "expected 0 rejections without signer")
	require.Equal(t, float64(0), readCounter(mc.RateLimitedByUser))
}

func TestDifferentIPsHaveIndependentLimits(t *testing.T) {
	t.Parallel()
	r, _, stop := setupRateLimiter(t, 10000, 5, 10000)
	defer stop()

	// Exhaust IP1
	fireRequests(r, 6, "10.0.0.1:1234")

	// IP2 should still work
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "10.0.0.2:1234"
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, "fresh IP should not be limited")
}

func TestDifferentKeysHaveIndependentLimits(t *testing.T) {
	t.Parallel()
	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)
	cfg := &config.Config{
		RateLimitPerKey: 5,
		RateLimitPerIP:  10000,
		RateLimitGlobal: 10000,
	}
	mw, stop := middleware.RateLimiter(discardLogger(), cfg, mc)
	defer stop()

	r := gin.New()
	r.Use(func(c *gin.Context) {
		if k := c.GetHeader("X-Test-Key"); k != "" {
			c.Set(middleware.ContextKeyTxSigner, k)
		}
		c.Next()
	})
	r.Use(mw)
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Exhaust key1
	for i := 0; i < 6; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		req.Header.Set("X-Test-Key", "0xKEY1")
		r.ServeHTTP(w, req)
	}

	// key2 should still work
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Test-Key", "0xKEY2")
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, "fresh key should not be limited")
}

func TestReturns429WithCorrectBody(t *testing.T) {
	t.Parallel()
	r, _, stop := setupRateLimiter(t, 1000, 1000, 1)
	defer stop()

	// First request consumes the single token
	fireRequests(r, 1, "192.168.1.1:12345")

	// Second request should be rejected
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusTooManyRequests, w.Code)

	var body map[string]string
	require.NoError(t, json.NewDecoder(w.Body).Decode(&body))
	require.Equal(t, "RATE_LIMITED", body["code"])
	require.Equal(t, "rate limit exceeded", body["error"])
	require.Equal(t, "60", w.Header().Get("Retry-After"))
}
