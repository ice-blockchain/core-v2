package cluster

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
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
// If the coordinator has a private key configured, it attempts to verify
// the heartbeat's ed25519 signature against the node's public key from nodeinfo.
// Falls back to unsigned parsing if signature verification is not required.
func (c *Coordinator) isNodeAlive(nodeID string) bool {
	ctx, cancel := context.WithTimeout(c.baseContext(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(HeartbeatKey(nodeID)))
	if err != nil {
		return false
	}

	var ts int64
	if pubKey := c.getNodePublicKey(ctx, nodeID); pubKey != nil {
		ts, err = ParseSignedHeartbeat(val, nodeID, pubKey)
		if err != nil {
			if c.cfg.HeartbeatSignatureRequired {
				c.logger.Debug("heartbeat signature verification failed",
					"node", nodeID, "error", err)
				return false
			}
			// Fall back to unsigned parse during rolling upgrade.
			ts, err = ParseHeartbeat(val)
			if err != nil {
				return false
			}
		}
	} else {
		ts, err = ParseHeartbeat(val)
		if err != nil {
			return false
		}
	}

	threshold := time.Now().Unix() - int64(c.cfg.StaleHeartbeatTimeout.Seconds())
	return ts >= threshold
}

// getNodePublicKey fetches a node's ed25519 public key from its nodeinfo CRDT entry.
func (c *Coordinator) getNodePublicKey(ctx context.Context, nodeID string) ed25519.PublicKey {
	val, err := c.crdt.Get(ctx, ds.NewKey(NodeInfoKey(nodeID)))
	if err != nil {
		return nil
	}
	info, err := UnmarshalNodeInfo(val)
	if err != nil || info.PublicKey == "" {
		return nil
	}
	pubKeyBytes, err := hex.DecodeString(info.PublicKey)
	if err != nil || len(pubKeyBytes) != ed25519.PublicKeySize {
		return nil
	}
	return ed25519.PublicKey(pubKeyBytes)
}
