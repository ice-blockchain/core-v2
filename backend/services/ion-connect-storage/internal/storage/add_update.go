package storage

import (
	"context"
	"fmt"
)

// handleAddUpdate handles storage.addUpdate RPC.
// Responds with updateInit containing a full bitfield (all pieces available).
func (h *Handler) handleAddUpdate(ctx context.Context, bagID [32]byte) ([]byte, error) {
	meta, err := h.ensureBagLoaded(ctx, bagID)
	if err != nil {
		return nil, fmt.Errorf("ensure bag loaded: %w", err)
	}

	bitfield := buildFullBitfield(meta.PieceCount)
	return serializeUpdateInitResponse(bitfield), nil
}
