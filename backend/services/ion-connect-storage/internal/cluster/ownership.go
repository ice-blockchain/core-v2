package cluster

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"math/rand/v2"
	"strings"
	"time"

	ds "github.com/ipfs/go-datastore"
)

const (
	ownerQueryTimeout = 5 * time.Second
	maxClaimAttempts  = 3
)

// ClaimBag adds this node's ownership claim for a bag.
// Writes dual keys: own/<bagID> -> nodeID and bynode/<nodeID>/<bagID> -> "".
func (c *Coordinator) ClaimBag(ctx context.Context, bagID [32]byte) error {
	byNodeKey := ds.NewKey(ByNodeKey(c.nodeID, bagID))
	ownerKey := ds.NewKey(OwnershipKey(bagID))

	// Write bynode/ first so reconciliation can detect orphaned entries
	// if a crash occurs between the two writes.
	if err := c.crdt.Put(ctx, byNodeKey, nil); err != nil {
		return fmt.Errorf("put bynode key: %w", err)
	}
	ts := time.Now().Unix()
	bagHex := hexEncode(bagID[:])
	ownerVal := FormatSignedOwnership(bagHex, c.nodeID, ts, c.cfg.PrivateKey)
	if err := c.crdt.Put(ctx, ownerKey, ownerVal); err != nil {
		_ = c.crdt.Delete(ctx, byNodeKey) // best-effort cleanup
		return fmt.Errorf("put ownership key: %w", err)
	}
	return nil
}

// ReleaseBag removes this node's ownership claim.
func (c *Coordinator) ReleaseBag(ctx context.Context, bagID [32]byte) error {
	ownerKey := ds.NewKey(OwnershipKey(bagID))
	byNodeKey := ds.NewKey(ByNodeKey(c.nodeID, bagID))

	if err := c.crdt.Delete(ctx, ownerKey); err != nil {
		return fmt.Errorf("delete ownership key: %w", err)
	}
	if err := c.crdt.Delete(ctx, byNodeKey); err != nil {
		return fmt.Errorf("delete bynode key: %w", err)
	}

	c.ownedCountMu.Lock()
	c.ownedCount.Add(-1)
	if c.metrics != nil {
		c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
	}
	c.ownedCountMu.Unlock()
	return nil
}

// OwnsBag checks if this node currently owns a bag.
func (c *Coordinator) OwnsBag(bagID [32]byte) bool {
	owner := c.Owner(bagID)
	return owner == c.nodeID
}

// baseContext returns the coordinator's lifecycle context, falling back to
// context.Background() if the coordinator has not been started yet (tests).
func (c *Coordinator) baseContext() context.Context {
	if c.ctx != nil {
		return c.ctx
	}
	return context.Background()
}

// Owner returns the nodeID that owns a bag, or empty string if unclaimed.
// Verifies the ed25519 signature on the ownership claim to prevent forgery.
func (c *Coordinator) Owner(bagID [32]byte) string {
	ctx, cancel := context.WithTimeout(c.baseContext(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(OwnershipKey(bagID)))
	if err != nil {
		return ""
	}
	bagHex := hexEncode(bagID[:])
	nodeID, ts, parseErr := ParseSignedOwnership(val, bagHex, func(nid string) ed25519.PublicKey {
		return c.getNodePublicKey(ctx, nid)
	})
	if parseErr != nil {
		c.logger.Debug("ownership signature invalid, rejecting", "error", parseErr)
		return ""
	}
	now := time.Now().Unix()
	if ts > now+maxClockSkew {
		c.logger.Debug("ownership claim timestamp in the future",
			"node", nodeID, "ts", ts, "now", now)
		return ""
	}
	return nodeID
}

// OwnsOrClaim checks ownership. If unclaimed, claims for this node.
// Returns true if this node is (or became) the owner.
// Uses ValidatedOwner to reject ownership claims from nodes without
// fresh heartbeats (prevents identity spoofing).
// Retries with deterministic backoff when all competing nodes roll back
// simultaneously (CRDT convergence race). Each node gets a different
// delay based on hash(nodeID+bagID), breaking the symmetry that causes
// all claimants to collide repeatedly.
func (c *Coordinator) OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error) {
	// Deterministic per-node delay so different nodes stagger their claims.
	// Uses a slot based on hash(nodeID+bagID) mod activeNodes, multiplied
	// by the verifyClaim total duration. This ensures the fastest node
	// completes its claim before the next node even starts, eliminating
	// CRDT write collisions that cause all claimants to roll back.
	//
	// claimSlotInterval = sum of exponential delays (base * (1+2+4) = base*7)
	// plus quorum overhead (~5s). Must be >= verifyClaim total duration.
	baseDelay := c.cfg.ClaimVerifyDelay
	if baseDelay == 0 {
		baseDelay = defaultClaimDelay
	}
	claimSlotInterval := baseDelay*7 + 5*time.Second

	bagHex := fmt.Sprintf("%x", bagID)
	claimSlot := simpleHash(c.nodeID+bagHex) % uint64(max(c.ActiveNodeCount(), 2))
	nodeDelay := time.Duration(claimSlot) * claimSlotInterval

	for attempt := range maxClaimAttempts {
		current := c.ValidatedOwner(bagID)
		if current == c.nodeID {
			return true, nil
		}
		if current != "" {
			return false, nil
		}

		backoff := nodeDelay
		if attempt > 0 {
			// On retry, use random backoff since the slot-based stagger
			// already failed (all slots may have collided).
			backoff = time.Duration(rand.IntN(1000*(attempt+1))) * time.Millisecond
		}
		select {
		case <-ctx.Done():
			return false, ctx.Err()
		case <-time.After(backoff):
		}

		if err := c.ClaimBag(ctx, bagID); err != nil {
			return false, err
		}

		if c.verifyClaim(ctx, bagID) {
			c.ownedCountMu.Lock()
			c.ownedCount.Add(1)
			if c.metrics != nil {
				c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
			}
			c.ownedCountMu.Unlock()
			return true, nil
		}
		c.rollbackClaim(ctx, bagID)
	}
	return false, nil
}

// OwnedCount returns the number of bags this node owns.
// Uses an atomic counter -- never iterates the CRDT.
func (c *Coordinator) OwnedCount() int {
	return int(c.ownedCount.Load())
}

// NodeADNLAddress reads a node's network info from CRDT key nodeinfo/<nodeID>.
func (c *Coordinator) NodeADNLAddress(nodeID string) ([32]byte, string, int, bool) {
	ctx, cancel := context.WithTimeout(c.baseContext(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(NodeInfoKey(nodeID)))
	if err != nil {
		return [32]byte{}, "", 0, false
	}
	info, err := UnmarshalNodeInfo(val)
	if err != nil {
		return [32]byte{}, "", 0, false
	}
	if info.ADNLAddress == "" {
		return [32]byte{}, info.IP, info.Port, true
	}
	addr, err := decodeHexToBytes(info.ADNLAddress, 32)
	if err != nil {
		return [32]byte{}, "", 0, false
	}
	var addrArr [32]byte
	copy(addrArr[:], addr)
	return addrArr, info.IP, info.Port, true
}

func decodeHexToBytes(hexStr string, expectedLen int) ([]byte, error) {
	hexStr = strings.TrimPrefix(hexStr, "0x")
	if len(hexStr) != expectedLen*2 {
		return nil, fmt.Errorf("hex string length %d, expected %d", len(hexStr), expectedLen*2)
	}
	dst := make([]byte, expectedLen)
	for i := 0; i < expectedLen; i++ {
		hi, ok := hexVal(hexStr[i*2])
		if !ok {
			return nil, fmt.Errorf("invalid hex char at position %d: %c", i*2, hexStr[i*2])
		}
		lo, ok := hexVal(hexStr[i*2+1])
		if !ok {
			return nil, fmt.Errorf("invalid hex char at position %d: %c", i*2+1, hexStr[i*2+1])
		}
		dst[i] = hi<<4 | lo
	}
	return dst, nil
}

func hexVal(b byte) (byte, bool) {
	switch {
	case b >= '0' && b <= '9':
		return b - '0', true
	case b >= 'a' && b <= 'f':
		return b - 'a' + 10, true
	case b >= 'A' && b <= 'F':
		return b - 'A' + 10, true
	default:
		return 0, false
	}
}
