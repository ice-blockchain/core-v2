package cluster

import (
	"context"
	"crypto/ed25519"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	ds "github.com/ipfs/go-datastore"
)

// ValidatedOwner returns the owner of a bag, but only if the owner has a
// fresh heartbeat. Returns "" if the owner cannot be validated, treating
// the bag as effectively unclaimed. This prevents identity spoofing where
// a malicious node writes another node's ID as the ownership value.
func (c *Coordinator) ValidatedOwner(bagID boc.BagID) string {
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
// Verifies the heartbeat's ed25519 signature against the node's public key
// from nodeinfo. Rejects nodes without a published public key.
func (c *Coordinator) isNodeAlive(nodeID string) bool {
	ctx, cancel := context.WithTimeout(c.baseContext(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(HeartbeatKey(nodeID)))
	if err != nil {
		return false
	}

	pubKey := c.getNodePublicKey(ctx, nodeID)
	if pubKey == nil {
		c.logger.Debug("heartbeat rejected: no public key for node", "node", nodeID)
		return false
	}
	ts, err := ParseSignedHeartbeat(val, nodeID, pubKey)
	if err != nil {
		c.logger.Debug("heartbeat signature verification failed",
			"node", nodeID, "error", err)
		return false
	}

	now := time.Now().Unix()
	threshold := now - int64(c.cfg.StaleHeartbeatTimeout.Seconds())
	return ts >= threshold && ts <= now+maxClockSkew
}

// getNodePublicKey fetches a node's ed25519 public key from its nodeinfo CRDT entry.
// Verifies the self-certifying signature to prevent public key overwrites.
func (c *Coordinator) getNodePublicKey(ctx context.Context, nodeID string) ed25519.PublicKey {
	val, err := c.crdt.Get(ctx, ds.NewKey(NodeInfoKey(nodeID)))
	if err != nil {
		return nil
	}
	pubKey, err := VerifyNodeInfo(val)
	if err != nil {
		c.logger.Debug("nodeinfo verification failed", "node", nodeID, "error", err)
		return nil
	}
	if hexEncode(pubKey) != nodeID {
		c.logger.Debug("nodeinfo pubkey does not match nodeID", "node", nodeID)
		return nil
	}
	return pubKey
}
