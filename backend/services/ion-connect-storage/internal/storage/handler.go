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

// LocalOwnershipChecker checks if this node owns a bag.
type LocalOwnershipChecker interface {
	OwnsBag(bagID [32]byte) bool
}

// PieceForwarder forwards piece requests to owning nodes.
type PieceForwarder interface {
	ForwardGetPiece(ctx context.Context, bagID [32]byte, pieceID int) (data []byte, proof []byte, err error)
	// ForwardRawQuery forwards any raw TL query to the bag owner and returns the raw response.
	ForwardRawQuery(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error)
}

// Handler implements TON Storage protocol RPC methods.
type Handler struct {
	metadataStore    *cache.MetadataStore
	segmentCache     *cache.SegmentCache
	fetcher          *greenfield.Fetcher
	index            *index.Persister
	ownershipChecker LocalOwnershipChecker
	pieceForwarder   PieceForwarder
	privateKey       ed25519.PrivateKey
	logger           *slog.Logger
}

// HandlerConfig holds dependencies for creating a Handler.
type HandlerConfig struct {
	MetadataStore    *cache.MetadataStore
	SegmentCache     *cache.SegmentCache
	Fetcher          *greenfield.Fetcher
	Index            *index.Persister
	OwnershipChecker LocalOwnershipChecker
	PieceForwarder   PieceForwarder
	PrivateKey       ed25519.PrivateKey
	Logger           *slog.Logger
}

// NewHandler creates a storage protocol handler.
func NewHandler(cfg HandlerConfig) *Handler {
	return &Handler{
		metadataStore:    cfg.MetadataStore,
		segmentCache:     cfg.SegmentCache,
		fetcher:          cfg.Fetcher,
		index:            cfg.Index,
		ownershipChecker: cfg.OwnershipChecker,
		pieceForwarder:   cfg.PieceForwarder,
		privateKey:       cfg.PrivateKey,
		logger:           cfg.Logger,
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

	// For non-owned bags, forward all data queries to the owning node.
	if !h.ownershipChecker.OwnsBag(bagID) && constructorID != tlPing && constructorID != tlGetRandomPeers {
		if constructorID == tlGetPiece {
			pieceID, pErr := parseGetPieceRequest(payload)
			if pErr != nil {
				return nil, pErr
			}
			return h.handleForwardedPiece(ctx, bagID, int(pieceID))
		}
		// Forward getTorrentInfo/addUpdate as raw queries to the owner.
		return h.pieceForwarder.ForwardRawQuery(ctx, bagID, rawQuery)
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
	if !h.ownershipChecker.OwnsBag(bagID) {
		return h.handleForwardedPiece(ctx, bagID, int(pieceID))
	}
	return h.handleGetPiece(ctx, bagID, int(pieceID))
}

func (h *Handler) handleForwardedPiece(ctx context.Context, bagID [32]byte, pieceID int) ([]byte, error) {
	data, proof, err := h.pieceForwarder.ForwardGetPiece(ctx, bagID, pieceID)
	if err != nil {
		return nil, fmt.Errorf("forward piece %d: %w", pieceID, err)
	}
	return serializePieceResponse(proof, data), nil
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
