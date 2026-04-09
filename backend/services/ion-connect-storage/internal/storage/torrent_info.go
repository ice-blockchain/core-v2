package storage

import (
	"context"
	"encoding/binary"
	"fmt"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// handleGetTorrentInfo handles storage.getTorrentInfo RPC.
// Returns TorrentInfo BoC wrapped in storage.torrentInfo TL response.
func (h *Handler) handleGetTorrentInfo(ctx context.Context, bagID boc.BagID) ([]byte, error) {
	meta, err := h.ensureBagLoaded(ctx, bagID)
	if err != nil {
		return nil, fmt.Errorf("ensure bag loaded: %w", err)
	}

	torrentInfoBoC, err := extractTorrentInfoBoC(meta.RawBoC)
	if err != nil {
		return nil, fmt.Errorf("extract torrent info BoC: %w", err)
	}

	return serializeTorrentInfoResponse(torrentInfoBoC)
}

const maxTorrentInfoBoCSize = 10 << 20 // 10 MB

// extractTorrentInfoBoC extracts the TorrentInfo BoC section from v2 .ionstorage bytes.
// Format: [1 byte: version][4 bytes LE: BoC len][TorrentInfo BoC][...rest...]
func extractTorrentInfoBoC(rawBoC []byte) ([]byte, error) {
	if len(rawBoC) < 5 {
		return nil, fmt.Errorf("raw BoC too short: %d bytes", len(rawBoC))
	}
	bocLen := binary.LittleEndian.Uint32(rawBoC[1:5])
	if bocLen > maxTorrentInfoBoCSize {
		return nil, fmt.Errorf("BoC length %d exceeds maximum %d", bocLen, maxTorrentInfoBoCSize)
	}
	end := 5 + int(bocLen)
	if len(rawBoC) < end {
		return nil, fmt.Errorf("raw BoC truncated: need %d, have %d", end, len(rawBoC))
	}
	return rawBoC[5:end], nil
}
