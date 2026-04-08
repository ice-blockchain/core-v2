package storage

import (
	"context"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cache"
)

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

	headerBytes := meta.HeaderBytes
	if len(headerBytes) == 0 {
		headerBytes, err = boc.SerializeTorrentHeader(meta.Header)
		if err != nil {
			return nil, nil, fmt.Errorf("serialize header: %w", err)
		}
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

	headerBytes := meta.HeaderBytes
	if len(headerBytes) == 0 {
		headerBytes, err = boc.SerializeTorrentHeader(meta.Header)
		if err != nil {
			return nil, fmt.Errorf("serialize header: %w", err)
		}
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

	return serializePieceResponse(proof, pieceData)
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
// Uses singleflight to prevent concurrent fetches for the same segment.
func (h *Handler) getOrFetchSegment(ctx context.Context, bagID [32]byte, meta *boc.BagMetadata, segIdx int) ([]byte, error) {
	data, ok, err := h.segmentCache.GetSegment(bagID, segIdx)
	if err != nil {
		return nil, fmt.Errorf("check segment cache: %w", err)
	}
	if ok {
		return data, nil
	}
	key := fmt.Sprintf("%x:%d", bagID, segIdx)
	result, err, _ := h.segmentFetchFlight.Do(key, func() (any, error) {
		// Double-check cache after acquiring the flight slot.
		if d, ok2, _ := h.segmentCache.GetSegment(bagID, segIdx); ok2 {
			return d, nil
		}
		return h.fetchAndCacheSegment(ctx, bagID, meta, segIdx)
	})
	if err != nil {
		return nil, err
	}
	return result.([]byte), nil
}

const (
	segmentFetchRetries  = 3
	segmentFetchBaseWait = 200 * time.Millisecond
)

// fetchAndCacheSegment downloads a segment from Greenfield and caches it.
// Retries transient failures with exponential backoff.
func (h *Handler) fetchAndCacheSegment(ctx context.Context, bagID [32]byte, meta *boc.BagMetadata, segIdx int) ([]byte, error) {
	loc, found, err := h.index.LookupBag(bagID)
	if err != nil {
		return nil, fmt.Errorf("lookup bag: %w", err)
	}
	if !found {
		return nil, fmt.Errorf("bag not found in index")
	}

	if err := h.ensureBagCacheOpen(bagID, meta); err != nil {
		return nil, fmt.Errorf("open bag cache: %w", err)
	}

	var lastErr error
	for attempt := range segmentFetchRetries {
		if attempt > 0 {
			wait := segmentFetchBaseWait * time.Duration(1<<uint(attempt-1))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(wait):
			}
		}

		wc, err := h.segmentCache.SegmentWriter(bagID, segIdx)
		if err != nil {
			return nil, fmt.Errorf("create segment writer: %w", err)
		}

		data, err := h.fetcher.FetchSegment(ctx, loc.BucketName, loc.ObjectName, segIdx, wc)
		closeErr := wc.Close()
		if err != nil {
			lastErr = err
			h.logger.Debug("fetch segment retry", "segment", segIdx, "attempt", attempt+1, "error", err)
			continue
		}
		if closeErr != nil {
			h.logger.Warn("close segment writer", "error", closeErr)
			return nil, fmt.Errorf("close segment writer for segment %d: %w", segIdx, closeErr)
		}

		h.segmentCache.MarkSegmentWritten(bagID, segIdx)
		return data, nil
	}
	return nil, fmt.Errorf("fetch segment %d after %d retries: %w", segIdx, segmentFetchRetries, lastErr)
}

// ensureBagCacheOpen creates the cache directory if not already present.
// Uses singleflight to prevent concurrent OpenBag calls for the same bag.
func (h *Handler) ensureBagCacheOpen(bagID [32]byte, meta *boc.BagMetadata) error {
	if h.segmentCache.HasBag(bagID) {
		return nil
	}
	key := hex.EncodeToString(bagID[:])
	_, err, _ := h.bagOpenFlight.Do(key, func() (any, error) {
		if h.segmentCache.HasBag(bagID) {
			return nil, nil
		}
		layout := cache.BagFileLayout{
			Files:     meta.Header.Files,
			TotalSize: meta.FileSize - meta.HeaderSize,
		}
		return nil, h.segmentCache.OpenBag(bagID, layout)
	})
	return err
}
