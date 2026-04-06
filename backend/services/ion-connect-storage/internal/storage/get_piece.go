package storage

import (
	"context"
	"encoding/hex"
	"fmt"
	"sync"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
)

var segmentPool = sync.Pool{
	New: func() any {
		b := make([]byte, boc.SegmentSize)
		return &b
	},
}

// ServePiece serves a piece locally, returning data and proof separately.
// Used by the cluster piece forwarding handler on the owning node.
func (h *Handler) ServePiece(ctx context.Context, bagID [32]byte, pieceIndex int) ([]byte, []byte, error) {
	meta, err := h.ensureBagLoaded(ctx, bagID)
	if err != nil {
		return nil, nil, fmt.Errorf("ensure bag loaded: %w", err)
	}
	if pieceIndex < 0 || pieceIndex >= meta.PieceCount {
		return nil, nil, fmt.Errorf("piece %d out of range [0, %d)", pieceIndex, meta.PieceCount)
	}

	headerBytes, err := boc.SerializeTorrentHeader(meta.Header)
	if err != nil {
		return nil, nil, fmt.Errorf("serialize header: %w", err)
	}

	segmentData, err := h.fetchSegmentForPiece(ctx, bagID, meta, pieceIndex)
	if err != nil {
		return nil, nil, err
	}

	pieceData, err := slicePieceData(headerBytes, segmentData, pieceIndex, meta.PieceSize, meta.FileSize, meta.HeaderSize)
	if err != nil {
		return nil, nil, fmt.Errorf("slice piece %d: %w", pieceIndex, err)
	}

	proof, err := boc.GenerateMerkleProof(meta.MerkleTree, pieceIndex, meta.PieceCount)
	if err != nil {
		return nil, nil, fmt.Errorf("generate proof for piece %d: %w", pieceIndex, err)
	}

	return pieceData, proof, nil
}

// handleGetPiece handles storage.getPiece RPC (hot path).
// Pieces cover headerBytes + payload (standard TON Storage format).
func (h *Handler) handleGetPiece(ctx context.Context, bagID [32]byte, pieceIndex int) ([]byte, error) {
	meta, err := h.ensureBagLoaded(ctx, bagID)
	if err != nil {
		return nil, fmt.Errorf("ensure bag loaded: %w", err)
	}
	if pieceIndex < 0 || pieceIndex >= meta.PieceCount {
		return nil, fmt.Errorf("piece %d out of range [0, %d)", pieceIndex, meta.PieceCount)
	}

	headerBytes, err := boc.SerializeTorrentHeader(meta.Header)
	if err != nil {
		return nil, fmt.Errorf("serialize header: %w", err)
	}

	segmentData, err := h.fetchSegmentForPiece(ctx, bagID, meta, pieceIndex)
	if err != nil {
		return nil, err
	}

	pieceData, err := slicePieceData(headerBytes, segmentData, pieceIndex, meta.PieceSize, meta.FileSize, meta.HeaderSize)
	if err != nil {
		return nil, fmt.Errorf("slice piece %d: %w", pieceIndex, err)
	}

	proof, err := boc.GenerateMerkleProof(meta.MerkleTree, pieceIndex, meta.PieceCount)
	if err != nil {
		return nil, fmt.Errorf("generate proof for piece %d: %w", pieceIndex, err)
	}

	return serializePieceResponse(proof, pieceData), nil
}

// fetchSegmentForPiece retrieves the Greenfield segment containing data for the given piece.
// Returns nil if the piece is entirely within the header (no payload needed).
func (h *Handler) fetchSegmentForPiece(ctx context.Context, bagID [32]byte, meta *boc.BagMetadata, pieceIndex int) ([]byte, error) {
	segIdx := payloadSegmentIndex(pieceIndex, meta.HeaderSize, meta.PieceSize)
	if segIdx < 0 {
		return nil, nil // piece is entirely header data
	}
	return h.getOrFetchSegment(ctx, bagID, meta, segIdx)
}

// getOrFetchSegment checks segment cache, falls back to Greenfield fetch.
func (h *Handler) getOrFetchSegment(ctx context.Context, bagID [32]byte, meta *boc.BagMetadata, segIdx int) ([]byte, error) {
	data, ok, err := h.segmentCache.GetSegment(bagID, segIdx)
	if err != nil {
		return nil, fmt.Errorf("check segment cache: %w", err)
	}
	if ok {
		return data, nil
	}
	return h.fetchAndCacheSegment(ctx, bagID, meta, segIdx)
}

// fetchAndCacheSegment downloads a segment from Greenfield and caches it.
func (h *Handler) fetchAndCacheSegment(ctx context.Context, bagID [32]byte, meta *boc.BagMetadata, segIdx int) ([]byte, error) {
	loc, found, err := h.index.LookupBag(bagID)
	if err != nil {
		return nil, fmt.Errorf("lookup bag: %w", err)
	}
	if !found {
		return nil, fmt.Errorf("bag not found in index")
	}

	h.ensureBagCacheOpen(bagID, meta)

	wc, err := h.segmentCache.SegmentWriter(bagID, segIdx)
	if err != nil {
		return nil, fmt.Errorf("create segment writer: %w", err)
	}

	data, err := h.fetcher.FetchSegment(ctx, loc.BucketName, loc.ObjectName, segIdx, wc)
	closeErr := wc.Close()
	if err != nil {
		return nil, fmt.Errorf("fetch segment %d: %w", segIdx, err)
	}
	if closeErr != nil {
		h.logger.Warn("close segment writer", "error", closeErr)
	}

	h.segmentCache.MarkSegmentWritten(bagID, segIdx)
	return data, nil
}

// ensureBagCacheOpen creates the cache directory if not already present.
// Uses singleflight to prevent concurrent OpenBag calls for the same bag.
func (h *Handler) ensureBagCacheOpen(bagID [32]byte, meta *boc.BagMetadata) {
	if h.segmentCache.HasBag(bagID) {
		return
	}
	key := hex.EncodeToString(bagID[:])
	h.bagOpenFlight.Do(key, func() (any, error) {
		if h.segmentCache.HasBag(bagID) {
			return nil, nil
		}
		layout := cache.BagFileLayout{
			Files:     meta.Header.Files,
			TotalSize: meta.FileSize - meta.HeaderSize,
		}
		if err := h.segmentCache.OpenBag(bagID, layout); err != nil {
			h.logger.Warn("open bag cache", "error", err)
		}
		return nil, nil
	})
}
