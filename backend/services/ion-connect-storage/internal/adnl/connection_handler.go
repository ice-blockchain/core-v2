package adnl

import (
	"context"
	"encoding/binary"
	"encoding/hex"
	"log/slog"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/adnl/rldp"
	"github.com/xssnick/tonutils-go/tl"
)

const tlPingConstructor uint32 = 0x44f3f211

// handleNewConnection is called when a new ADNL peer connects.
func (s *Server) handleNewConnection(client adnl.Peer) error {
	setupOverlayRLDP(client, s.overlays, s.httpBridge, s.logger)
	return nil
}

// setupOverlayRLDP wires ADNL + RLDP overlay query dispatch for a peer.
// If an HTTP bridge is provided, non-overlay RLDP queries are forwarded
// to the bridge (HTTP-over-RLDP for provider index).
func setupOverlayRLDP(client adnl.Peer, overlays *OverlayManager, bridge *RLDPHTTPBridge, logger *slog.Logger) {
	extADNL := overlay.CreateExtendedADNL(client)
	rl := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))

	extADNL.SetQueryHandler(func(query *adnl.MessageQuery) error {
		if _, ok := query.Data.(GetCapabilities); ok {
			return client.Answer(context.Background(), query.ID, &Capabilities{Value: capabilityRLDP2})
		}
		return nil
	})
	extADNL.SetOnUnknownOverlayQuery(makeADNLHandler(overlays, extADNL, rl, logger))
	rl.SetOnUnknownOverlayQuery(makeRLDPHandler(overlays, rl, logger))

	if bridge != nil {
		rl.SetOnQuery(bridge.MakeRLDPQueryHandler(rl))
	}

	logger.Debug("new ADNL connection", "peer", hex.EncodeToString(client.GetID()))
}

func makeADNLHandler(overlays *OverlayManager, peer *overlay.ADNLWrapper, rl *overlay.RLDPWrapper, logger *slog.Logger) func(query *adnl.MessageQuery) error {
	return func(query *adnl.MessageQuery) error {
		req, overlayIDBytes := overlay.UnwrapQuery(query.Data)
		if overlayIDBytes == nil {
			return nil
		}

		var overlayID [32]byte
		copy(overlayID[:], overlayIDBytes)

		rawQuery := extractRawTL(req)
		if rawQuery == nil {
			return nil
		}

		checkPingAndNotify(rawQuery, overlays, rl, overlayIDBytes, overlayID)

		ctx := context.Background()
		resp, err := overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			return err
		}

		return peer.Answer(ctx, query.ID, tl.Raw(resp))
	}
}

func makeRLDPHandler(overlays *OverlayManager, peer *overlay.RLDPWrapper, logger *slog.Logger) func(transferID []byte, query *rldp.Query) error {
	return func(transferID []byte, query *rldp.Query) error {
		req, overlayIDBytes := overlay.UnwrapQuery(query.Data)
		if overlayIDBytes == nil {
			return nil
		}

		var overlayID [32]byte
		copy(overlayID[:], overlayIDBytes)

		rawQuery := extractRawTL(req)
		if rawQuery == nil {
			return nil
		}

		ctx := context.Background()
		resp, err := overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			logger.Debug("RLDP overlay query failed", "error", err)
			return err
		}

		return peer.SendAnswer(ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, tl.Raw(resp))
	}
}

// checkPingAndNotify detects Ping messages and triggers session initialization.
func checkPingAndNotify(rawQuery []byte, overlays *OverlayManager, rl *overlay.RLDPWrapper, overlayIDBytes []byte, overlayID [32]byte) {
	if len(rawQuery) < 12 {
		return
	}
	constructorID := binary.LittleEndian.Uint32(rawQuery[:4])
	if constructorID != tlPingConstructor {
		return
	}
	sessionID := int64(binary.LittleEndian.Uint64(rawQuery[4:12]))
	bagID, ok := overlays.LookupBagID(overlayID)
	if !ok {
		return
	}
	overlays.NotifyNewSession(rl, overlayIDBytes, bagID, sessionID)
}

func extractRawTL(obj tl.Serializable) []byte {
	switch v := obj.(type) {
	case tl.Raw:
		return v
	default:
		data, err := tl.Serialize(obj, true)
		if err != nil {
			return nil
		}
		return data
	}
}
