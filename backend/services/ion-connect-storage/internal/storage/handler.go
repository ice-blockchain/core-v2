package storage

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log/slog"

	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/tvm/cell"
	"golang.org/x/sync/singleflight"

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
	metadataStore      *cache.MetadataStore
	segmentCache       *cache.SegmentCache
	fetcher            *greenfield.Fetcher
	index              *index.Persister
	ownershipChecker   LocalOwnershipChecker
	pieceForwarder     PieceForwarder
	overlayNodeBuilder func(overlayID []byte) (*overlay.Node, error)
	logger             *slog.Logger
	bagOpenFlight      singleflight.Group
}

// HandlerConfig holds dependencies for creating a Handler.
type HandlerConfig struct {
	MetadataStore      *cache.MetadataStore
	SegmentCache       *cache.SegmentCache
	Fetcher            *greenfield.Fetcher
	Index              *index.Persister
	OwnershipChecker   LocalOwnershipChecker
	PieceForwarder     PieceForwarder
	OverlayNodeBuilder func(overlayID []byte) (*overlay.Node, error)
	Logger             *slog.Logger
}

// NewHandler creates a storage protocol handler.
// Returns an error if required dependencies are nil.
func NewHandler(cfg HandlerConfig) (*Handler, error) {
	if cfg.OwnershipChecker == nil {
		return nil, fmt.Errorf("handler: OwnershipChecker is required")
	}
	if cfg.PieceForwarder == nil {
		return nil, fmt.Errorf("handler: PieceForwarder is required")
	}
	if cfg.MetadataStore == nil {
		return nil, fmt.Errorf("handler: MetadataStore is required")
	}
	if cfg.OverlayNodeBuilder == nil {
		return nil, fmt.Errorf("handler: OverlayNodeBuilder is required")
	}
	if cfg.Logger == nil {
		return nil, fmt.Errorf("handler: Logger is required")
	}
	return &Handler{
		metadataStore:      cfg.MetadataStore,
		segmentCache:       cfg.SegmentCache,
		fetcher:            cfg.Fetcher,
		index:              cfg.Index,
		ownershipChecker:   cfg.OwnershipChecker,
		pieceForwarder:     cfg.PieceForwarder,
		overlayNodeBuilder: cfg.OverlayNodeBuilder,
		logger:             cfg.Logger,
	}, nil
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
			if pieceID < 0 {
				return nil, fmt.Errorf("invalid piece ID: %d", pieceID)
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
	if pieceID < 0 {
		return nil, fmt.Errorf("invalid piece ID: %d", pieceID)
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
	if err := h.verifyForwardedPiece(ctx, bagID, pieceID, proof, data); err != nil {
		return nil, fmt.Errorf("forwarded piece %d invalid: %w", pieceID, err)
	}
	return serializePieceResponse(proof, data)
}

// verifyForwardedPiece checks both the Merkle proof structure and the data hash
// to prevent a compromised cluster node from serving corrupted data.
func (h *Handler) verifyForwardedPiece(ctx context.Context, bagID [32]byte, pieceID int, proof []byte, data []byte) error {
	if len(proof) == 0 {
		return fmt.Errorf("empty proof")
	}
	meta, err := h.ensureBagLoaded(ctx, bagID)
	if err != nil {
		return fmt.Errorf("load bag metadata: %w", err)
	}
	proofCell, err := cell.FromBOC(proof)
	if err != nil {
		return fmt.Errorf("parse proof BoC: %w", err)
	}
	if err := cell.CheckProof(proofCell, meta.RootHash[:]); err != nil {
		return fmt.Errorf("proof verification: %w", err)
	}
	leafHash, err := boc.ExtractLeafHash(proofCell, pieceID, meta.PieceCount)
	if err != nil {
		return fmt.Errorf("extract leaf hash: %w", err)
	}
	dataHash := sha256.Sum256(data)
	if dataHash != leafHash {
		return fmt.Errorf("data hash mismatch: proof %x, actual %x", leafHash[:8], dataHash[:8])
	}
	return nil
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
