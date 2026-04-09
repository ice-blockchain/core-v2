package provider

import (
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

const maxTrackedPeers = 100_000

type peerEntry struct {
	limiter    *rate.Limiter
	lastAccess atomic.Int64
}

// PeerRateLimiter enforces per-peer request rate limits using token buckets.
type PeerRateLimiter struct {
	peers     sync.Map
	peerCount atomic.Int64
	rps       rate.Limit
	burst     int
	done      chan struct{}
	closeOnce sync.Once
}

// NewPeerRateLimiter creates a rate limiter that allows rps requests per
// second per peer with the given burst size. Starts a background cleanup
// goroutine that removes stale entries every 10 minutes.
func NewPeerRateLimiter(rps float64, burst int) *PeerRateLimiter {
	rl := &PeerRateLimiter{rps: rate.Limit(rps), burst: burst, done: make(chan struct{})}
	go rl.cleanupLoop()
	return rl
}

// Close stops the background cleanup goroutine. Safe to call multiple times.
func (rl *PeerRateLimiter) Close() { rl.closeOnce.Do(func() { close(rl.done) }) }

// Middleware returns a gin middleware that rate-limits requests by peer ID.
// Peers are identified by the X-RLDP-Peer-ID header set by the RLDP bridge.
// Falls back to client IP when the header is absent.
//
// Security: The X-RLDP-Peer-ID header is always set by the upstream RLDP bridge
// (rldp_http.go). The ClientIP fallback is only reached if a request bypasses
// the bridge. In that case, Gin's ClientIP trusts X-Forwarded-For by default,
// which can be spoofed unless gin.SetTrustedProxies is configured in deployment.
func (rl *PeerRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		peerID := c.GetHeader("X-RLDP-Peer-ID")
		if peerID == "" {
			peerID = "ip:" + c.ClientIP()
		}
		now := time.Now().Unix()
		val, loaded := rl.peers.LoadOrStore(peerID, rl.newEntry(now))
		if !loaded {
			if rl.peerCount.Add(1) > maxTrackedPeers {
				rl.peers.Delete(peerID)
				rl.peerCount.Add(-1)
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many peers"})
				return
			}
		}
		entry := val.(*peerEntry)
		entry.lastAccess.Store(now)
		if !entry.limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}

func (rl *PeerRateLimiter) newEntry(nowUnix int64) *peerEntry {
	e := &peerEntry{limiter: rate.NewLimiter(rl.rps, rl.burst)}
	e.lastAccess.Store(nowUnix)
	return e
}

func (rl *PeerRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			cutoff := time.Now().Add(-10 * time.Minute).Unix()
			rl.peers.Range(func(key, value any) bool {
				if value.(*peerEntry).lastAccess.Load() < cutoff {
					if _, deleted := rl.peers.LoadAndDelete(key); deleted {
						rl.peerCount.Add(-1)
					}
				}
				return true
			})
		case <-rl.done:
			return
		}
	}
}
