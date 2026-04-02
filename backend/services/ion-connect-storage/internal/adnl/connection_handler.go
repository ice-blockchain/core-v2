package adnl

import (
	"context"
	"encoding/hex"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/adnl/rldp"
	"github.com/xssnick/tonutils-go/tl"
)

// handleNewConnection is called when a new ADNL peer connects.
// Sets up RLDP with overlay query dispatching.
func (s *Server) handleNewConnection(client adnl.Peer) error {
	extADNL := overlay.CreateExtendedADNL(client)
	extADNL.SetOnUnknownOverlayQuery(s.handleADNLOverlayQuery(extADNL))

	rl := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))
	rl.SetOnUnknownOverlayQuery(s.handleRLDPOverlayQuery(rl))

	s.logger.Debug("new ADNL connection", "peer", hex.EncodeToString(client.GetID()))
	return nil
}

// handleADNLOverlayQuery handles non-RLDP overlay queries (small messages).
func (s *Server) handleADNLOverlayQuery(peer *overlay.ADNLWrapper) func(query *adnl.MessageQuery) error {
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
		resp, err := s.overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			s.logger.Debug("ADNL overlay query failed", "error", err)
			return err
		}

		return peer.Answer(ctx, query.ID, tl.Raw(resp))
	}
}

// handleRLDPOverlayQuery handles RLDP overlay queries (large payloads like pieces).
func (s *Server) handleRLDPOverlayQuery(peer *overlay.RLDPWrapper) func(transferID []byte, query *rldp.Query) error {
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
		resp, err := s.overlays.HandleIncomingQuery(ctx, overlayID, rawQuery)
		if err != nil {
			s.logger.Debug("RLDP overlay query failed", "error", err)
			return err
		}

		return peer.SendAnswer(ctx, query.MaxAnswerSize, query.Timeout, query.ID, transferID, tl.Raw(resp))
	}
}

// extractRawTL extracts raw bytes from a TL deserialized object.
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
