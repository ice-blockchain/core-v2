package storage

import (
	"fmt"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
)

// handleGetRandomPeers handles overlay.getRandomPeers RPC.
// Returns this node as the sole peer (Phase 4: single node, ownership always true).
func (h *Handler) handleGetRandomPeers(bagID boc.BagID) ([]byte, error) {
	node, err := h.overlayNodeBuilder(bagID[:])
	if err != nil {
		return nil, fmt.Errorf("build overlay node: %w", err)
	}
	if node == nil {
		return nil, fmt.Errorf("build overlay node: returned nil node")
	}

	response := overlay.NodesList{List: []overlay.Node{*node}}
	data, err := tl.Serialize(response, true)
	if err != nil {
		return nil, fmt.Errorf("serialize nodes list: %w", err)
	}
	return data, nil
}
