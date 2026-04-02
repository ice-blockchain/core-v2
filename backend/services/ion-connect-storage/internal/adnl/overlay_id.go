package adnl

import "crypto/sha256"

// ComputeOverlayID derives the overlay network ID from a bag ID.
// The overlay ID is SHA256(bagID).
func ComputeOverlayID(bagID [32]byte) [32]byte {
	return sha256.Sum256(bagID[:])
}
