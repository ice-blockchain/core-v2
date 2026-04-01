package adnl

import (
	"context"
	"log/slog"

	lru "github.com/hashicorp/golang-lru/v2"
)

type OverlayManager struct {
	overlays *lru.Cache[[32]byte, struct{}]
	logger   *slog.Logger
}

func newOverlayManager(limit int, logger *slog.Logger) *OverlayManager {
	cache, _ := lru.NewWithEvict[[32]byte, struct{}](limit, func(bagID [32]byte, _ struct{}) {
		logger.Info("overlay evicted from LRU", "bag_id_prefix", bagID[:4])
	})

	return &OverlayManager{
		overlays: cache,
		logger:   logger,
	}
}

func (m *OverlayManager) Join(_ context.Context, bagID [32]byte) error {
	if m.overlays.Contains(bagID) {
		return nil
	}
	m.overlays.Add(bagID, struct{}{})
	m.logger.Info("joined overlay", "bag_id_prefix", bagID[:4], "active_count", m.overlays.Len())
	return nil
}

func (m *OverlayManager) Leave(bagID [32]byte) error {
	m.overlays.Remove(bagID)
	m.logger.Info("left overlay", "bag_id_prefix", bagID[:4], "active_count", m.overlays.Len())
	return nil
}

func (m *OverlayManager) ActiveCount() int {
	return m.overlays.Len()
}
