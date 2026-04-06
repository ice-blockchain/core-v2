package cluster

import (
	"context"
	"time"

	ds "github.com/ipfs/go-datastore"
)

// ValidatedOwner returns the owner of a bag, but only if the owner has a
// fresh heartbeat. Returns "" if the owner cannot be validated, treating
// the bag as effectively unclaimed. This prevents identity spoofing where
// a malicious node writes another node's ID as the ownership value.
func (c *Coordinator) ValidatedOwner(bagID [32]byte) string {
	owner := c.Owner(bagID)
	if owner == "" {
		return ""
	}
	if owner == c.nodeID {
		return owner
	}
	if !c.isNodeAlive(owner) {
		c.logger.Debug("ownership rejected: node has no fresh heartbeat",
			"owner", owner, "bag", bagID[:4])
		return ""
	}
	return owner
}

// isNodeAlive checks whether a node has a heartbeat within the stale timeout.
func (c *Coordinator) isNodeAlive(nodeID string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(HeartbeatKey(nodeID)))
	if err != nil {
		return false
	}
	ts, err := ParseHeartbeat(val)
	if err != nil {
		return false
	}
	threshold := time.Now().Unix() - int64(c.cfg.StaleHeartbeatTimeout.Seconds())
	return ts >= threshold
}
