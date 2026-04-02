package storage

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
)

// Handler implements TON Storage protocol RPC methods.
type Handler struct {
	metadataStore *cache.MetadataStore
	segmentCache  *cache.SegmentCache
	fetcher       *greenfield.Fetcher
	index         *index.Persister
	privateKey    ed25519.PrivateKey
	logger        *slog.Logger
}

// HandlerConfig holds dependencies for creating a Handler.
type HandlerConfig struct {
	MetadataStore *cache.MetadataStore
	SegmentCache  *cache.SegmentCache
	Fetcher       *greenfield.Fetcher
	Index         *index.Persister
	PrivateKey    ed25519.PrivateKey
	Logger        *slog.Logger
}

// NewHandler creates a storage protocol handler.
func NewHandler(cfg HandlerConfig) *Handler {
	return &Handler{
		metadataStore: cfg.MetadataStore,
		segmentCache:  cfg.SegmentCache,
		fetcher:       cfg.Fetcher,
		index:         cfg.Index,
		privateKey:    cfg.PrivateKey,
		logger:        cfg.Logger,
	}
}

// HandleOverlayQuery dispatches a TL-encoded query to the appropriate handler.
// Called by the overlay manager when an RLDP query arrives for a known overlay.
// The bagID is resolved from overlayID by the overlay manager before calling this.
func (h *Handler) HandleOverlayQuery(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error) {
	constructorID, payload, err := parseTLConstructorID(rawQuery)
	if err != nil {
		return nil, fmt.Errorf("parse TL constructor: %w", err)
	}

	switch constructorID {
	case tlGetTorrentInfo:
		return h.handleGetTorrentInfo(ctx, bagID)
	case tlGetPiece:
		return h.handleGetPieceFromTL(ctx, bagID, payload)
	case tlAddUpdate:
		return h.handleAddUpdateFromTL(ctx, bagID, payload)
	case tlPing:
		return h.handlePingFromTL(payload)
	case tlGetRandomPeers:
		return h.handleGetRandomPeers(bagID)
	default:
		return nil, fmt.Errorf("unknown TL constructor: 0x%08x", constructorID)
	}
}

func (h *Handler) handleGetPieceFromTL(ctx context.Context, bagID [32]byte, payload []byte) ([]byte, error) {
	pieceID, err := parseGetPieceRequest(payload)
	if err != nil {
		return nil, err
	}
	return h.handleGetPiece(ctx, bagID, int(pieceID))
}

func (h *Handler) handleAddUpdateFromTL(ctx context.Context, bagID [32]byte, payload []byte) ([]byte, error) {
	_, _, _, err := parseAddUpdateRequest(payload)
	if err != nil {
		return nil, err
	}
	return h.handleAddUpdate(ctx, bagID)
}

func (h *Handler) handlePingFromTL(payload []byte) ([]byte, error) {
	_, err := parsePingRequest(payload)
	if err != nil {
		return nil, err
	}
	return serializePongResponse(), nil
}

// ensureBagLoaded fetches and caches bag metadata if not already present.
func (h *Handler) ensureBagLoaded(ctx context.Context, bagID [32]byte) (*boc.BagMetadata, error) {
	return h.metadataStore.GetBagMetadata(ctx, bagID)
}
