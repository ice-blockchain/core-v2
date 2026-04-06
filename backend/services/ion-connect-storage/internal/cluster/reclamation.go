package cluster

import (
	"context"
	"time"

	ds "github.com/ipfs/go-datastore"
	dsq "github.com/ipfs/go-datastore/query"
)

// StartReclamation begins the dead node detection and bag reclamation loop.
// Runs until ctx is cancelled. Should be called as a goroutine.
func (c *Coordinator) StartReclamation(ctx context.Context) {
	// Wait before first reclamation cycle so CRDT heartbeats from other
	// nodes have time to propagate. Without this delay a freshly joined
	// node would immediately classify peers as dead.
	select {
	case <-ctx.Done():
		return
	case <-time.After(c.cfg.ReclamationStartDelay):
	}

	ticker := time.NewTicker(c.cfg.ReclamationInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.runReclamationCycle(ctx)
		}
	}
}

func (c *Coordinator) runReclamationCycle(ctx context.Context) {
	active, dead := listActiveNodes(c.crdt, c.cfg.StaleHeartbeatTimeout, c.logger)
	if len(dead) == 0 {
		return
	}

	if c.metrics != nil {
		c.metrics.NodesActive.Set(float64(len(active)))
	}

	for _, deadNodeID := range dead {
		if !c.isResponsibleForReclamation(deadNodeID, active) {
			continue
		}
		c.reclaimBagsFromNode(ctx, deadNodeID)
	}
}

// isResponsibleForReclamation checks if this node is XOR-closest to the dead node
// among all active nodes. Only the closest node reclaims to prevent thundering herd.
func (c *Coordinator) isResponsibleForReclamation(deadNodeID string, activeNodes []string) bool {
	if len(activeNodes) == 0 {
		return false
	}

	deadHash := simpleHash(deadNodeID)
	myDistance := xorDistance(simpleHash(c.nodeID), deadHash)
	for _, nodeID := range activeNodes {
		if nodeID == c.nodeID {
			continue
		}
		otherDistance := xorDistance(simpleHash(nodeID), deadHash)
		if otherDistance < myDistance {
			return false
		}
		if otherDistance == myDistance && nodeID < c.nodeID {
			return false // deterministic tiebreak on nodeID
		}
	}
	return true
}

// reclaimBagsFromNode scans bynode/<deadNodeID>/ prefix and claims orphaned bags.
// O(k) where k = dead node's bag count.
func (c *Coordinator) reclaimBagsFromNode(ctx context.Context, deadNodeID string) {
	prefix := ByNodePrefix(deadNodeID)
	results, err := c.crdt.Query(ctx, dsq.Query{Prefix: prefix, KeysOnly: true})
	if err != nil {
		c.logger.Error("query dead node bags", "dead_node", deadNodeID, "error", err)
		return
	}
	defer results.Close()

	var reclaimed int
	for r := range results.Next() {
		if r.Error != nil {
			continue
		}
		bagID := extractBagIDFromByNodeKey(r.Key, deadNodeID)
		if bagID == ([32]byte{}) {
			continue
		}

		if err := c.reclaimSingleBag(ctx, bagID, deadNodeID); err != nil {
			c.logger.Warn("reclaim bag", "bag_id_prefix", bagID[:4], "error", err)
			continue
		}
		reclaimed++
	}

	if reclaimed > 0 {
		c.logger.Info("reclaimed bags from dead node",
			"dead_node", deadNodeID, "count", reclaimed)
	}
	c.cleanupDeadNodeKeys(ctx, deadNodeID)
}

// reclaimSingleBag reclaims a bag from a dead node. The TOCTOU window between
// Owner() and ClaimBag() is mitigated by isResponsibleForReclamation (only the
// XOR-closest active node reclaims) combined with ClaimBag's post-claim
// verification via CRDT convergence (OwnsOrClaim pattern). If two nodes race,
// CRDT last-write-wins resolves it deterministically.
func (c *Coordinator) reclaimSingleBag(ctx context.Context, bagID [32]byte, deadNodeID string) error {
	current := c.Owner(bagID)
	if current != "" && current != deadNodeID {
		return nil // already claimed by another active node
	}

	// Claim first, then clean up the dead node's key.
	// This avoids a window where the bag has no owner (delete-before-claim).
	// CRDT last-write-wins ensures the new ownership overwrites the dead value.
	if err := c.ClaimBag(ctx, bagID); err != nil {
		return err
	}
	if err := c.crdt.Delete(ctx, ds.NewKey(ByNodeKey(deadNodeID, bagID))); err != nil {
		return err
	}
	return nil
}

func (c *Coordinator) cleanupDeadNodeKeys(ctx context.Context, deadNodeID string) {
	_ = c.crdt.Delete(ctx, ds.NewKey(HeartbeatKey(deadNodeID)))
	_ = c.crdt.Delete(ctx, ds.NewKey(NodeInfoKey(deadNodeID)))
}

func extractBagIDFromByNodeKey(key string, nodeID string) [32]byte {
	// Key format: /bynode/<nodeID>/<hex-bagID>
	prefix := "/" + ByNodePrefix(nodeID)
	if len(key) <= len(prefix) {
		return [32]byte{}
	}
	hexStr := key[len(prefix):]
	if len(hexStr) != 64 {
		return [32]byte{}
	}
	decoded, err := decodeHexToBytes(hexStr, 32)
	if err != nil {
		return [32]byte{}
	}
	var bagID [32]byte
	copy(bagID[:], decoded)
	return bagID
}

// simpleHash produces a uint64 hash from a string for XOR distance calculation.
func simpleHash(s string) uint64 {
	// FNV-1a inspired hash for deterministic XOR distance.
	var h uint64 = 14695981039346656037
	for i := 0; i < len(s); i++ {
		h ^= uint64(s[i])
		h *= 1099511628211
	}
	return h
}

func xorDistance(a, b uint64) uint64 {
	return a ^ b
}

// listActiveNodesFromCRDT is used by reclamation and ActiveNodeCount.
// Already defined in coordinator.go.

// Ensure import is used by the query in reclaimBagsFromNode.
var _ dsq.Query
