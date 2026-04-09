package cluster

import (
	"context"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	ds "github.com/ipfs/go-datastore"
)

const (
	claimVerifyAttempts = 3
	defaultClaimDelay   = 2 * time.Second
)

// verifyClaim waits for CRDT convergence and checks if this node won the
// ownership claim. Performs multiple reads with exponential backoff.
// Returns true only if all reads confirm this node as owner.
func (c *Coordinator) verifyClaim(ctx context.Context, bagID boc.BagID) bool {
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
	if t := c.transport.Load(); t != nil && c.ActiveNodeCount() > 1 {
		if !c.quorumConfirmOwnership(ctx, t, bagID) {
			return false
		}
	}
	return true
}

// quorumConfirmOwnership asks connected peers who they believe owns a bag.
// Returns true only if enough peers responded (based on total active nodes)
// and a majority of responding peers agree this node owns it.
func (c *Coordinator) quorumConfirmOwnership(ctx context.Context, t *ClusterTransport, bagID boc.BagID) bool {
	activeNodes := c.ActiveNodeCount()
	results := t.QueryPeerOwnership(ctx, bagID)
	if len(results) == 0 {
		c.logger.Warn("quorum check: no peers responded", "bag", bagID[:4])
		return false
	}
	minResponses := activeNodes / 2
	if minResponses < 1 {
		minResponses = 1
	}
	if len(results) < minResponses {
		c.logger.Warn("quorum check: insufficient responses",
			"got", len(results), "need", minResponses, "active", activeNodes, "bag", bagID[:4])
		return false
	}
	agree := 0
	for _, owner := range results {
		if owner == c.nodeID {
			agree++
		}
	}
	return agree > len(results)/2
}

// rollbackClaim undoes a failed ownership claim. Removes the orphaned keys
// to prevent stale entries. Only deletes the ownership key if this node
// still owns it -- prevents the loser's rollback from destroying the
// winner's legitimate claim in a race.
func (c *Coordinator) rollbackClaim(ctx context.Context, bagID boc.BagID) {
	if c.metrics != nil {
		c.metrics.ConflictsResolved.Inc()
	}
	if c.Owner(bagID) == c.nodeID {
		ownerKey := ds.NewKey(OwnershipKey(bagID))
		if err := c.crdt.Delete(ctx, ownerKey); err != nil {
			c.logger.Warn("rollback claim: delete ownership key", "error", err)
		}
	}
	byNodeKey := ds.NewKey(ByNodeKey(c.nodeID, bagID))
	if err := c.crdt.Delete(ctx, byNodeKey); err != nil {
		c.logger.Warn("rollback claim: delete bynode key", "error", err)
	}
}
