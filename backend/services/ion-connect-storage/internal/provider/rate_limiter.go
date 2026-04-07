package provider

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type peerEntry struct {
	limiter    *rate.Limiter
	lastAccess time.Time
}

// PeerRateLimiter enforces per-peer request rate limits using token buckets.
type PeerRateLimiter struct {
	peers sync.Map
	rps   rate.Limit
	burst int
}

// NewPeerRateLimiter creates a rate limiter that allows rps requests per
// second per peer with the given burst size. Starts a background cleanup
// goroutine that removes stale entries every 10 minutes.
func NewPeerRateLimiter(rps float64, burst int) *PeerRateLimiter {
	rl := &PeerRateLimiter{rps: rate.Limit(rps), burst: burst}
	go rl.cleanupLoop()
	return rl
}

// Middleware returns a gin middleware that rate-limits requests by peer ID.
// Peers are identified by the X-RLDP-Peer-ID header set by the RLDP bridge.
func (rl *PeerRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		peerID := c.GetHeader("X-RLDP-Peer-ID")
		if peerID == "" {
			c.Next()
			return
		}
		now := time.Now()
		val, _ := rl.peers.LoadOrStore(peerID, &peerEntry{
			limiter:    rate.NewLimiter(rl.rps, rl.burst),
			lastAccess: now,
		})
		entry := val.(*peerEntry)
		entry.lastAccess = now
		if !entry.limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}

func (rl *PeerRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		rl.peers.Range(func(key, value any) bool {
			if value.(*peerEntry).lastAccess.Before(cutoff) {
				rl.peers.Delete(key)
			}
			return true
		})
	}
}
