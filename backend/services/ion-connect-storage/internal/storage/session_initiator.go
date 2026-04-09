package storage

import (
	"context"
	"encoding/binary"
	"fmt"
	"log/slog"
	"time"

	lru "github.com/hashicorp/golang-lru/v2"
	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tl"
	"golang.org/x/sync/semaphore"
)

const (
	maxTrackedSessions   = 100_000
	maxConcurrentInits   = 100
	sessionInitiateQuery = 1 << 25
)

// SessionInitiator sends the seeder's UpdateInit bitfield to connected peers.
type SessionInitiator struct {
	handler   *Handler
	logger    *slog.Logger
	initiated *lru.Cache[sessionKey, struct{}]
	sem       *semaphore.Weighted
}

type sessionKey struct {
	bagID     boc.BagID
	sessionID int64
}

// NewSessionInitiator creates a session initiator.
func NewSessionInitiator(handler *Handler, logger *slog.Logger) (*SessionInitiator, error) {
	cache, err := lru.New[sessionKey, struct{}](maxTrackedSessions)
	if err != nil {
		return nil, fmt.Errorf("create session cache: %w", err)
	}
	return &SessionInitiator{
		handler:   handler,
		logger:    logger,
		initiated: cache,
		sem:       semaphore.NewWeighted(maxConcurrentInits),
	}, nil
}

// OnNewSession is the callback for OverlayManager.SetSessionCallback.
// Sends UpdateInit back to the peer in a goroutine.
func (s *SessionInitiator) OnNewSession(rldp ionadnl.RLDPDoQueryer, overlayIDBytes []byte, bagID boc.BagID, sessionID int64) {
	key := sessionKey{bagID: bagID, sessionID: sessionID}

	if !s.sem.TryAcquire(1) {
		s.logger.Warn("session init throttled, too many concurrent inits")
		return
	}
	// Check inside semaphore to prevent duplicate goroutines from the
	// TOCTOU race where two callers both pass a pre-semaphore Get check.
	if _, ok := s.initiated.Get(key); ok {
		s.sem.Release(1)
		return
	}
	s.initiated.Add(key, struct{}{})
	go func() {
		defer s.sem.Release(1)
		s.sendUpdateInit(rldp, overlayIDBytes, bagID, sessionID)
	}()
}

func (s *SessionInitiator) sendUpdateInit(rldp ionadnl.RLDPDoQueryer, overlayIDBytes []byte, bagID boc.BagID, sessionID int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	meta, err := s.handler.ensureBagLoaded(ctx, bagID)
	if err != nil {
		s.logger.Debug("session init: load metadata failed", "error", err)
		return
	}

	bitfield := buildFullBitfield(meta.PieceCount)
	updatePayload, err := buildAddUpdateWithInit(sessionID, 0, bitfield)
	if err != nil {
		s.logger.Debug("session init: build update payload failed", "error", err)
		return
	}

	// Serialize overlay query manually: overlay.Query TL + inner payload
	overlayQueryBytes, err := tl.Serialize(overlay.Query{Overlay: overlayIDBytes}, true)
	if err != nil {
		s.logger.Debug("session init: serialize overlay query failed", "error", err)
		return
	}
	fullQuery := append(overlayQueryBytes, updatePayload...)

	var result any
	if err := rldp.DoQuery(ctx, sessionInitiateQuery, tl.Raw(fullQuery), &result); err != nil {
		s.logger.Debug("session init: send update init failed", "error", err)
	}
}

func buildAddUpdateWithInit(sessionID int64, seqno int32, bitfield []byte) ([]byte, error) {
	buf := appendUint32(nil, tlAddUpdate)
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, uint64(sessionID))
	buf = append(buf, b...)
	buf = appendInt32(buf, seqno)
	initBuf, err := serializeUpdateInitResponse(bitfield)
	if err != nil {
		return nil, fmt.Errorf("build update init: %w", err)
	}
	buf = append(buf, initBuf...)
	return buf, nil
}
