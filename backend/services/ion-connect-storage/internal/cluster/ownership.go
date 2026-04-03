package cluster

import (
	"context"
	"fmt"
	"strings"

	ds "github.com/ipfs/go-datastore"
)

// ClaimBag adds this node's ownership claim for a bag.
// Writes dual keys: own/<bagID> -> nodeID and bynode/<nodeID>/<bagID> -> "".
func (c *Coordinator) ClaimBag(ctx context.Context, bagID [32]byte) error {
	ownerKey := ds.NewKey(OwnershipKey(bagID))
	byNodeKey := ds.NewKey(ByNodeKey(c.nodeID, bagID))

	if err := c.crdt.Put(ctx, ownerKey, []byte(c.nodeID)); err != nil {
		return fmt.Errorf("put ownership key: %w", err)
	}
	if err := c.crdt.Put(ctx, byNodeKey, nil); err != nil {
		return fmt.Errorf("put bynode key: %w", err)
	}

	c.ownedCount.Add(1)
	if c.metrics != nil {
		c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
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

	c.ownedCount.Add(-1)
	if c.metrics != nil {
		c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
	}
	return nil
}

// OwnsBag checks if this node currently owns a bag.
func (c *Coordinator) OwnsBag(bagID [32]byte) bool {
	owner := c.Owner(bagID)
	return owner == c.nodeID
}

// Owner returns the nodeID that owns a bag, or empty string if unclaimed.
func (c *Coordinator) Owner(bagID [32]byte) string {
	val, err := c.crdt.Get(context.Background(), ds.NewKey(OwnershipKey(bagID)))
	if err != nil {
		return ""
	}
	return string(val)
}

// OwnsOrClaim checks ownership. If unclaimed, claims for this node.
// Returns true if this node is (or became) the owner.
func (c *Coordinator) OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error) {
	current := c.Owner(bagID)
	if current == c.nodeID {
		return true, nil
	}
	if current != "" {
		return false, nil
	}

	if err := c.ClaimBag(ctx, bagID); err != nil {
		return false, err
	}

	// After claiming, verify we won (CRDT may converge to another node).
	winner := c.Owner(bagID)
	if winner != c.nodeID {
		c.ownedCount.Add(-1)
		if c.metrics != nil {
			c.metrics.BagsOwned.Set(float64(c.ownedCount.Load()))
			c.metrics.ConflictsResolved.Inc()
		}
		return false, nil
	}
	return true, nil
}

// OwnedCount returns the number of bags this node owns.
// Uses an atomic counter -- never iterates the CRDT.
func (c *Coordinator) OwnedCount() int {
	return int(c.ownedCount.Load())
}

// NodeADNLAddress reads a node's network info from CRDT key nodeinfo/<nodeID>.
func (c *Coordinator) NodeADNLAddress(nodeID string) ([32]byte, string, int, bool) {
	val, err := c.crdt.Get(context.Background(), ds.NewKey(NodeInfoKey(nodeID)))
	if err != nil {
		return [32]byte{}, "", 0, false
	}
	info, err := UnmarshalNodeInfo(val)
	if err != nil {
		return [32]byte{}, "", 0, false
	}
	var addr [32]byte
	decodeHexToBytes(info.ADNLAddress, addr[:])
	return addr, info.IP, info.Port, true
}

func decodeHexToBytes(hex string, dst []byte) {
	hex = strings.TrimPrefix(hex, "0x")
	for i := 0; i < len(dst) && i*2+1 < len(hex); i++ {
		dst[i] = hexVal(hex[i*2])<<4 | hexVal(hex[i*2+1])
	}
}

func hexVal(b byte) byte {
	switch {
	case b >= '0' && b <= '9':
		return b - '0'
	case b >= 'a' && b <= 'f':
		return b - 'a' + 10
	case b >= 'A' && b <= 'F':
		return b - 'A' + 10
	default:
		return 0
	}
}
