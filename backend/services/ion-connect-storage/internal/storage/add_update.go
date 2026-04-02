package storage

import "context"

// handleAddUpdate handles storage.addUpdate RPC.
// Responds with Ok.
func (h *Handler) handleAddUpdate(_ context.Context, _ [32]byte) ([]byte, error) {
	return serializeOkResponse(), nil
}
