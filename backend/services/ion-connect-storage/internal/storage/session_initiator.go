package storage

import (
	"context"
	"encoding/binary"
	"log/slog"
	"sync"
	"time"

	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
)

// SessionInitiator sends the seeder's UpdateInit bitfield to connected peers.
type SessionInitiator struct {
	handler   *Handler
	logger    *slog.Logger
	mu        sync.Mutex
	initiated map[sessionKey]struct{}
}

type sessionKey struct {
	bagID     [32]byte
	sessionID int64
}

// NewSessionInitiator creates a session initiator.
func NewSessionInitiator(handler *Handler, logger *slog.Logger) *SessionInitiator {
	return &SessionInitiator{
		handler:   handler,
		logger:    logger,
		initiated: make(map[sessionKey]struct{}),
	}
}

// OnNewSession is the callback for OverlayManager.SetSessionCallback.
// Sends UpdateInit back to the peer in a goroutine.
func (s *SessionInitiator) OnNewSession(rldp ionadnl.RLDPDoQueryer, overlayIDBytes []byte, bagID [32]byte, sessionID int64) {
	key := sessionKey{bagID: bagID, sessionID: sessionID}
	s.mu.Lock()
	if _, exists := s.initiated[key]; exists {
		s.mu.Unlock()
		return
	}
	s.initiated[key] = struct{}{}
	s.mu.Unlock()

	go s.sendUpdateInit(rldp, overlayIDBytes, bagID, sessionID)
}

func (s *SessionInitiator) sendUpdateInit(rldp ionadnl.RLDPDoQueryer, overlayIDBytes []byte, bagID [32]byte, sessionID int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	meta, err := s.handler.ensureBagLoaded(ctx, bagID)
	if err != nil {
		s.logger.Debug("session init: load metadata failed", "error", err)
		return
	}

	bitfield := buildFullBitfield(meta.PieceCount)
	updatePayload := buildAddUpdateWithInit(sessionID, 0, bitfield)

	// Serialize overlay query manually: overlay.Query TL + inner payload
	overlayQueryBytes, err := tl.Serialize(overlay.Query{Overlay: overlayIDBytes}, true)
	if err != nil {
		s.logger.Debug("session init: serialize overlay query failed", "error", err)
		return
	}
	fullQuery := append(overlayQueryBytes, updatePayload...)

	var result any
	if err := rldp.DoQuery(ctx, 1<<25, tl.Raw(fullQuery), &result); err != nil {
		s.logger.Debug("session init: send update init failed", "error", err)
	}
}

func buildAddUpdateWithInit(sessionID int64, seqno int32, bitfield []byte) []byte {
	buf := appendUint32(nil, tlAddUpdate)
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, uint64(sessionID))
	buf = append(buf, b...)
	buf = appendInt32(buf, seqno)
	buf = append(buf, serializeUpdateInitResponse(bitfield)...)
	return buf
}
