package cluster

import (
	"context"
	"fmt"
	"strings"
	"time"

	ds "github.com/ipfs/go-datastore"
)

const ownerQueryTimeout = 5 * time.Second

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
	ctx, cancel := context.WithTimeout(context.Background(), ownerQueryTimeout)
	defer cancel()
	val, err := c.crdt.Get(ctx, ds.NewKey(OwnershipKey(bagID)))
	if err != nil {
		return ""
	}
	return string(val)
}

// OwnsOrClaim checks ownership. If unclaimed, claims for this node.
// Returns true if this node is (or became) the owner.
// Uses ValidatedOwner to reject ownership claims from nodes without
// fresh heartbeats (prevents identity spoofing).
func (c *Coordinator) OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error) {
	current := c.ValidatedOwner(bagID)
	if current == c.nodeID {
		return true, nil
	}
	if current != "" {
		return false, nil
	}

	if err := c.ClaimBag(ctx, bagID); err != nil {
		return false, err
	}

	if c.verifyClaim(ctx, bagID) {
		return true, nil
	}
	c.rollbackClaim(ctx, bagID)
	return false, nil
}

// OwnedCount returns the number of bags this node owns.
// Uses an atomic counter -- never iterates the CRDT.
func (c *Coordinator) OwnedCount() int {
	return int(c.ownedCount.Load())
}

// NodeADNLAddress reads a node's network info from CRDT key nodeinfo/<nodeID>.
func (c *Coordinator) NodeADNLAddress(nodeID string) ([32]byte, string, int, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), ownerQueryTimeout)
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
