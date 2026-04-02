package adnl

import (
	"github.com/xssnick/tonutils-go/adnl/keys"
	"github.com/xssnick/tonutils-go/tl"
)

// ComputeOverlayID derives the overlay network ID from a bag ID.
// Uses tl.Hash(PublicKeyOverlay{Key: bagID}) matching tonutils-storage.
func ComputeOverlayID(bagID [32]byte) [32]byte {
	hashBytes, _ := tl.Hash(keys.PublicKeyOverlay{Key: bagID[:]})
	var result [32]byte
	copy(result[:], hashBytes)
	return result
}
