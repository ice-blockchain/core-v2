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
	setupOverlayRLDP(client, s.overlays, s.httpBridge, s.clusterOverlayID, s.clusterQueryHandler, s.logger)
	return nil
}

func setupOverlayRLDP(client adnl.Peer, overlays *OverlayManager, bridge *RLDPHTTPBridge, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, logger *slog.Logger) {
	extADNL := overlay.CreateExtendedADNL(client)
	rl := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))

	extADNL.SetQueryHandler(func(query *adnl.MessageQuery) error {
		if _, ok := query.Data.(GetCapabilities); ok {
			return client.Answer(context.Background(), query.ID, &Capabilities{Value: capabilityRLDP2})
		}
		// Handle cluster queries sent without overlay wrapping (block exchange).
		if clusterHandler != nil {
			rawQuery := extractRawTL(query.Data)
			if rawQuery == nil {
				logger.Debug("root handler: extractRawTL returned nil", "type", query.Data)
			}
			if rawQuery != nil && len(rawQuery) >= 4 {
				resp, err := clusterHandler(context.Background(), rawQuery)
				if err != nil {
					return err
				}
				if resp != nil {
					return client.Answer(context.Background(), query.ID, tl.Raw(resp))
				}
			}
		}
		return nil
	})
	extADNL.SetOnUnknownOverlayQuery(makeADNLHandler(overlays, extADNL, rl, clusterOverlayID, clusterHandler, client, logger))
	rl.SetOnUnknownOverlayQuery(makeRLDPHandler(overlays, rl, clusterOverlayID, clusterHandler, logger))

	if bridge != nil {
		rl.SetOnQuery(bridge.MakeRLDPQueryHandler(rl))
	}

	logger.Debug("new ADNL connection", "peer", hex.EncodeToString(client.GetID()))
}

// makeADNLHandler routes overlay queries. Cluster overlay goes to clusterHandler;
// storage overlays go to OverlayManager.
func makeADNLHandler(overlays *OverlayManager, peer *overlay.ADNLWrapper, rl *overlay.RLDPWrapper, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, rawPeer adnl.Peer, logger *slog.Logger) func(query *adnl.MessageQuery) error {
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

		ctx := context.Background()

		if clusterHandler != nil && overlayID == clusterOverlayID {
			resp, err := clusterHandler(ctx, rawQuery)
			if err != nil {
				return err
			}
			if resp != nil {
				// Answer via the overlay wrapper (not raw peer) so the
				// sender's adnlWrapper.Query receives the response.
				return peer.Answer(ctx, query.ID, tl.Raw(resp))
			}
			return nil
		}

		checkPingAndNotify(rawQuery, overlays, rl, overlayIDBytes, overlayID)

		resp, err := overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			return err
		}

		return peer.Answer(ctx, query.ID, tl.Raw(resp))
	}
}

func makeRLDPHandler(overlays *OverlayManager, peer *overlay.RLDPWrapper, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, logger *slog.Logger) func(transferID []byte, query *rldp.Query) error {
	return func(transferID []byte, query *rldp.Query) error {
		req, overlayIDBytes := overlay.UnwrapQuery(query.Data)
		if overlayIDBytes == nil {
			logger.Debug("RLDP: no overlay in query")
			return nil
		}
		logger.Debug("RLDP overlay query received")

		var overlayID [32]byte
		copy(overlayID[:], overlayIDBytes)

		rawQuery := extractRawTL(req)
		if rawQuery == nil {
			return nil
		}

		ctx := context.Background()

		if clusterHandler != nil && overlayID == clusterOverlayID {
			resp, err := clusterHandler(ctx, rawQuery)
			if err != nil {
				return err
			}
			return peer.SendAnswer(ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, tl.Raw(resp))
		}

		resp, err := overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			logger.Debug("RLDP overlay query failed", "error", err)
			return err
		}

		return peer.SendAnswer(ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, tl.Raw(resp))
	}
}

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
