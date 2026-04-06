package cluster

import (
	"context"
	"time"

	ds "github.com/ipfs/go-datastore"
)

const (
	claimVerifyAttempts = 3
	defaultClaimDelay   = 500 * time.Millisecond
)

// verifyClaim waits for CRDT convergence and checks if this node won the
// ownership claim. Performs multiple reads with exponential backoff.
// Returns true only if all reads confirm this node as owner.
func (c *Coordinator) verifyClaim(ctx context.Context, bagID [32]byte) bool {
	baseDelay := c.cfg.ClaimVerifyDelay
	if baseDelay == 0 {
		baseDelay = defaultClaimDelay
	}
	for attempt := range claimVerifyAttempts {
		delay := baseDelay * time.Duration(1<<uint(attempt))
		select {
		case <-ctx.Done():
			return false
		case <-time.After(delay):
		}
		if c.Owner(bagID) != c.nodeID {
			return false
		}
	}
	return true
}

// rollbackClaim undoes a failed ownership claim. Decrements the owned count
// and removes the orphaned bynode key to prevent stale entries.
func (c *Coordinator) rollbackClaim(ctx context.Context, bagID [32]byte) {
	c.ownedCount.Add(-1)
	if c.metrics != nil {
		c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
		c.metrics.ConflictsResolved.Inc()
	}
	ownerKey := ds.NewKey(OwnershipKey(bagID))
	if err := c.crdt.Delete(ctx, ownerKey); err != nil {
		c.logger.Warn("rollback claim: delete ownership key", "error", err)
	}
	byNodeKey := ds.NewKey(ByNodeKey(c.nodeID, bagID))
	if err := c.crdt.Delete(ctx, byNodeKey); err != nil {
		c.logger.Warn("rollback claim: delete bynode key", "error", err)
	}
}
