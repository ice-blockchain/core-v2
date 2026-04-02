package adnl

import (
	"context"
	"fmt"
	"log/slog"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/xssnick/tonutils-go/tl"
)

// QueryHandler processes a storage protocol query for a given bagID.
// The raw query is the inner TL payload (after overlay unwrapping).
type QueryHandler func(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error)

// SessionCallback is called when a new peer session is detected.
type SessionCallback func(rldp RLDPDoQueryer, overlayID []byte, bagID [32]byte, sessionID int64)

// RLDPDoQueryer can send RLDP queries to a peer.
type RLDPDoQueryer interface {
	DoQuery(ctx context.Context, maxAnswerSize uint64, query, result tl.Serializable) error
}

// OverlayManager tracks active per-bag overlays with an LRU cache.
// Maps overlayID (SHA256(bagID)) -> bagID for reverse lookup.
type OverlayManager struct {
	overlays        *lru.Cache[[32]byte, [32]byte]
	queryHandler    QueryHandler
	sessionCallback SessionCallback
	logger          *slog.Logger
}

func newOverlayManager(limit int, logger *slog.Logger) *OverlayManager {
	cache, _ := lru.NewWithEvict[[32]byte, [32]byte](limit, func(overlayID [32]byte, _ [32]byte) {
		logger.Info("overlay evicted from LRU", "overlay_id_prefix", overlayID[:4])
	})

	return &OverlayManager{
		overlays: cache,
		logger:   logger,
	}
}

// SetQueryHandler registers the storage handler for incoming overlay queries.
func (m *OverlayManager) SetQueryHandler(handler QueryHandler) {
	m.queryHandler = handler
}

// SetSessionCallback registers a callback for new peer sessions.
func (m *OverlayManager) SetSessionCallback(cb SessionCallback) {
	m.sessionCallback = cb
}

// NotifyNewSession triggers the session callback for a new peer connection.
func (m *OverlayManager) NotifyNewSession(rldp RLDPDoQueryer, overlayID []byte, bagID [32]byte, sessionID int64) {
	if cb := m.sessionCallback; cb != nil {
		cb(rldp, overlayID, bagID, sessionID)
	}
}

// Join registers a bag's overlay in the LRU.
func (m *OverlayManager) Join(_ context.Context, bagID [32]byte) error {
	overlayID := ComputeOverlayID(bagID)
	if m.overlays.Contains(overlayID) {
		return nil
	}
	m.overlays.Add(overlayID, bagID)
	m.logger.Info("joined overlay", "bag_id_prefix", bagID[:4], "active_count", m.overlays.Len())
	return nil
}

// Leave removes a bag's overlay from the LRU.
func (m *OverlayManager) Leave(bagID [32]byte) error {
	overlayID := ComputeOverlayID(bagID)
	m.overlays.Remove(overlayID)
	m.logger.Info("left overlay", "bag_id_prefix", bagID[:4], "active_count", m.overlays.Len())
	return nil
}

// LookupBagID resolves a bagID from an overlayID.
func (m *OverlayManager) LookupBagID(overlayID [32]byte) ([32]byte, bool) {
	return m.overlays.Get(overlayID)
}

// HandleIncomingQuery dispatches an incoming overlay query to the registered handler.
func (m *OverlayManager) HandleIncomingQuery(ctx context.Context, overlayID [32]byte, rawQuery []byte) ([]byte, error) {
	bagID, ok := m.LookupBagID(overlayID)
	if !ok {
		return nil, fmt.Errorf("overlay not active: %x", overlayID[:8])
	}
	if m.queryHandler == nil {
		return nil, fmt.Errorf("no query handler registered")
	}
	return m.queryHandler(ctx, bagID, rawQuery)
}

// ActiveCount returns the number of active overlays.
func (m *OverlayManager) ActiveCount() int {
	return m.overlays.Len()
}
