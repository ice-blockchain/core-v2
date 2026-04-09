package storage

import (
	"context"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// handleAddUpdate handles storage.addUpdate RPC.
// Responds with Ok.
func (h *Handler) handleAddUpdate(_ context.Context, _ boc.BagID) ([]byte, error) {
	return serializeOkResponse(), nil
}
