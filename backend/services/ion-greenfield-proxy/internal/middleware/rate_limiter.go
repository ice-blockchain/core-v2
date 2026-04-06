package middleware

import (
	"log/slog"
	"math"
	"net/http"
	"sync/atomic"
	"time"

	"ion-greenfield-proxy/internal/apperror"
	"ion-greenfield-proxy/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/puzpuzpuz/xsync/v4"
	"golang.org/x/time/rate"
)

type rateLimitEntry struct {
	limiter    *rate.Limiter
	lastAccess atomic.Int64
}

type rateLimiter struct {
	global  *rate.Limiter
	perIP   *xsync.Map[string, *rateLimitEntry]
	perKey  *xsync.Map[string, *rateLimitEntry]
	ipRate  rate.Limit
	ipBurst int
	keyRate rate.Limit
	keyBurst int
	metrics *MetricsCollectors
	logger  *slog.Logger
}

func newRateLimiter(logger *slog.Logger, cfg *config.Config, mc *MetricsCollectors) *rateLimiter {
	rl := &rateLimiter{
		global:   rate.NewLimiter(perHourRate(cfg.RateLimitGlobal), cfg.RateLimitGlobal),
		perIP:    xsync.NewMap[string, *rateLimitEntry](),
		perKey:   xsync.NewMap[string, *rateLimitEntry](),
		ipRate:   perHourRate(cfg.RateLimitPerIP),
		ipBurst:  cfg.RateLimitPerIP,
		keyRate:  perHourRate(cfg.RateLimitPerKey),
		keyBurst: cfg.RateLimitPerKey,
		metrics:  mc,
		logger:   logger,
	}
	return rl
}

func perHourRate(limit int) rate.Limit {
	if limit <= 0 {
		return rate.Limit(math.MaxFloat64)
	}
	return rate.Limit(float64(limit) / 3600.0)
}

func (rl *rateLimiter) getOrCreate(m *xsync.Map[string, *rateLimitEntry], key string, r rate.Limit, burst int) *rate.Limiter {
	now := time.Now().Unix()
	entry, _ := m.LoadOrCompute(key, func() (*rateLimitEntry, bool) {
		e := &rateLimitEntry{limiter: rate.NewLimiter(r, burst)}
		e.lastAccess.Store(now)
		return e, false
	})
	entry.lastAccess.Store(now)
	return entry.limiter
}

func (rl *rateLimiter) handle(c *gin.Context) {
	if !rl.global.Allow() {
		if rl.metrics != nil {
			rl.metrics.RateLimitedGlobal.Inc()
		}
		rl.reject(c)
		return
	}

	ip := c.ClientIP()
	ipLimiter := rl.getOrCreate(rl.perIP, ip, rl.ipRate, rl.ipBurst)
	if !ipLimiter.Allow() {
		if rl.metrics != nil {
			rl.metrics.RateLimitedByIP.Inc()
		}
		rl.reject(c)
		return
	}

	if key, ok := c.Get(ContextKeyTxSigner); ok {
		if keyStr, ok := key.(string); ok && keyStr != "" {
			keyLimiter := rl.getOrCreate(rl.perKey, keyStr, rl.keyRate, rl.keyBurst)
			if !keyLimiter.Allow() {
				if rl.metrics != nil {
					rl.metrics.RateLimitedByUser.Inc()
				}
				rl.reject(c)
				return
			}
		}
	}

	c.Next()
}

func (rl *rateLimiter) reject(c *gin.Context) {
	c.Header("Retry-After", "60")
	apperror.WriteError(c, apperror.New(http.StatusTooManyRequests, "RATE_LIMITED", "rate limit exceeded"))
	c.Abort()
}

func (rl *rateLimiter) cleanup() {
	cutoff := time.Now().Add(-1 * time.Hour).Unix()
	rl.perIP.Range(func(key string, entry *rateLimitEntry) bool {
		if entry.lastAccess.Load() < cutoff {
			rl.perIP.Delete(key)
		}
		return true
	})
	rl.perKey.Range(func(key string, entry *rateLimitEntry) bool {
		if entry.lastAccess.Load() < cutoff {
			rl.perKey.Delete(key)
		}
		return true
	})
}

// StartCleanup starts a background goroutine that evicts stale rate limit entries.
// Call the returned function to stop it.
func (rl *rateLimiter) StartCleanup(interval time.Duration) func() {
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				rl.cleanup()
			case <-done:
				return
			}
		}
	}()
	return func() { close(done) }
}

// RateLimiter returns a gin middleware that enforces per-key, per-IP, and global rate limits.
// stopCleanup must be called on shutdown to stop the background cleanup goroutine.
func RateLimiter(logger *slog.Logger, cfg *config.Config, mc *MetricsCollectors) (gin.HandlerFunc, func()) {
	rl := newRateLimiter(logger.With("component", "rate_limiter"), cfg, mc)
	stopCleanup := rl.StartCleanup(10 * time.Minute)

	logger.Info("rate limiter initialized",
		"per_key", cfg.RateLimitPerKey,
		"per_ip", cfg.RateLimitPerIP,
		"global", cfg.RateLimitGlobal,
	)

	return rl.handle, stopCleanup
}
