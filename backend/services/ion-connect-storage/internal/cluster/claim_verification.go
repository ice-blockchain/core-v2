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
	ok, reason := evaluateQuorum(results, activeNodes, c.nodeID)
	if !ok {
		c.logger.Warn("quorum check failed",
			"reason", reason, "responses", len(results), "active", activeNodes, "bag", bagID[:4])
	}
	return ok
}

// evaluateQuorum decides whether peer responses confirm ownership.
// activeNodes includes self; results are remote peer responses only.
// Requires at least (activeNodes-1)/2 responses (majority of remote peers)
// and majority agreement among responders.
func evaluateQuorum(results []string, activeNodes int, nodeID string) (bool, string) {
	if len(results) == 0 {
		return false, "no peers responded"
	}
	remotePeers := activeNodes - 1 // exclude self
	minResponses := (remotePeers + 1) / 2
	if minResponses < 1 {
		minResponses = 1
	}
	if len(results) < minResponses {
		return false, "insufficient responses"
	}
	agree := 0
	for _, owner := range results {
		if owner == nodeID {
			agree++
		}
	}
	if agree <= len(results)/2 {
		return false, "no majority agreement"
	}
	return true, ""
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
