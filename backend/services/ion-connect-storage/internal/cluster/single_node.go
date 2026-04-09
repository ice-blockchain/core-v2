package cluster

import (
	"context"
	"fmt"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// SingleNodeCoordinator implements all cluster interfaces for non-cluster mode.
// Every bag is owned locally. No forwarding. No CRDT.
type SingleNodeCoordinator struct {
	nodeID   string
	adnlAddr [32]byte
	ip       string
	port     int
}

// NewSingleNodeCoordinator creates a coordinator that claims everything locally.
func NewSingleNodeCoordinator(nodeID string, adnlAddr [32]byte, ip string, port int) *SingleNodeCoordinator {
	return &SingleNodeCoordinator{
		nodeID:   nodeID,
		adnlAddr: adnlAddr,
		ip:       ip,
		port:     port,
	}
}

// OwnsOrClaim always returns true -- single node owns all bags.
func (c *SingleNodeCoordinator) OwnsOrClaim(_ context.Context, _ boc.BagID) (bool, error) {
	return true, nil
}

// OwnsBag always returns true.
func (c *SingleNodeCoordinator) OwnsBag(_ boc.BagID) bool {
	return true
}

// Owner always returns this node's ID.
func (c *SingleNodeCoordinator) Owner(_ boc.BagID) string {
	return c.nodeID
}

// NodeADNLAddress returns this node's address for any nodeID.
func (c *SingleNodeCoordinator) NodeADNLAddress(_ string) ([32]byte, string, int, bool) {
	return c.adnlAddr, c.ip, c.port, true
}

// ForwardGetPiece should never be called -- OwnsBag is always true.
func (c *SingleNodeCoordinator) ForwardGetPiece(_ context.Context, _ boc.BagID, _ int) ([]byte, []byte, error) {
	return nil, nil, fmt.Errorf("single node coordinator does not forward pieces")
}

// ForwardRawQuery should never be called -- OwnsBag is always true.
func (c *SingleNodeCoordinator) ForwardRawQuery(_ context.Context, _ boc.BagID, _ []byte) ([]byte, error) {
	return nil, fmt.Errorf("single node coordinator does not forward queries")
}

// IsConnected always returns true.
func (c *SingleNodeCoordinator) IsConnected() bool {
	return true
}

// ActiveNodeCount always returns 1.
func (c *SingleNodeCoordinator) ActiveNodeCount() int {
	return 1
}

// Stop is a no-op for single-node mode.
func (c *SingleNodeCoordinator) Stop() {}
