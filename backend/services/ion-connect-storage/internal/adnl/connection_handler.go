package adnl

import (
	"context"
	"crypto/ed25519"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/adnl/rldp"
	"github.com/xssnick/tonutils-go/tl"
)

const (
	tlPingConstructor   uint32 = 0x44f3f211
	queryHandlerTimeout        = 30 * time.Second
)

// handleNewConnection is called when a new ADNL peer connects.
func (s *Server) handleNewConnection(client adnl.Peer) error {
	if !s.ready.Load() {
		s.logger.Debug("rejecting connection: server not ready")
		return fmt.Errorf("server not ready")
	}
	newCount := s.activeConnections.Add(1)
	if newCount > int64(s.maxConnections) {
		s.activeConnections.Add(-1)
		s.logger.Warn("rejecting connection: max connections reached", "max", s.maxConnections)
		return fmt.Errorf("max connections reached")
	}
	client.SetDisconnectHandler(func(_ string, _ ed25519.PublicKey) {
		s.activeConnections.Add(-1)
	})
	cc := s.loadClusterConfig()
	setupOverlayRLDP(client, s.overlays, s.httpBridge, cc.overlayID, cc.queryHandler, cc.memberChecker, s.querySemaphore, s.logger)
	return nil
}

func setupOverlayRLDP(client adnl.Peer, overlays *OverlayManager, bridge *RLDPHTTPBridge, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, memberChecker ClusterMemberChecker, querySem chan struct{}, logger *slog.Logger) {
	peerID := client.GetID()
	extADNL := overlay.CreateExtendedADNL(client)
	rl := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))

	extADNL.SetQueryHandler(func(query *adnl.MessageQuery) (retErr error) {
		defer recoverPanic(logger, &retErr)

		select {
		case querySem <- struct{}{}:
			defer func() { <-querySem }()
		default:
			return fmt.Errorf("query concurrency limit reached")
		}
		ctx, cancel := context.WithTimeout(context.Background(), queryHandlerTimeout)
		defer cancel()

		if _, ok := query.Data.(GetCapabilities); ok {
			return client.Answer(ctx, query.ID, &Capabilities{Value: capabilityRLDP2})
		}
		// Handle cluster queries sent without overlay wrapping (block exchange).
		if clusterHandler != nil {
			if memberChecker == nil || !memberChecker.IsClusterMember(peerID) {
				logger.Debug("rejected cluster query from non-member peer", "peer", hex.EncodeToString(peerID[:8]))
				return nil
			}
			rawQuery := extractRawTL(query.Data)
			if rawQuery != nil && len(rawQuery) >= 4 {
				resp, err := clusterHandler(ctx, rawQuery)
				if err != nil {
					logger.Debug("root cluster query handler error", "error", err)
					return err
				}
				if resp != nil {
					return client.Answer(ctx, query.ID, tl.Raw(resp))
				}
			}
		}
		logger.Debug("unhandled root ADNL query", "type", fmt.Sprintf("%T", query.Data))
		return nil
	})
	extADNL.SetOnUnknownOverlayQuery(makeADNLHandler(overlays, extADNL, rl, clusterOverlayID, clusterHandler, memberChecker, peerID, querySem, logger))
	rl.SetOnUnknownOverlayQuery(makeRLDPHandler(overlays, rl, clusterOverlayID, clusterHandler, memberChecker, peerID, querySem, logger))

	if bridge != nil {
		rl.SetOnQuery(bridge.MakeRLDPQueryHandler(rl, client.GetID()))
	}

	logger.Debug("new ADNL connection", "peer", hex.EncodeToString(client.GetID()))
}

// makeADNLHandler routes overlay queries. Cluster overlay goes to clusterHandler;
// storage overlays go to OverlayManager.
func makeADNLHandler(overlays *OverlayManager, peer *overlay.ADNLWrapper, rl *overlay.RLDPWrapper, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, memberChecker ClusterMemberChecker, peerID []byte, querySem chan struct{}, logger *slog.Logger) func(query *adnl.MessageQuery) error {
	return func(query *adnl.MessageQuery) (retErr error) {
		defer recoverPanic(logger, &retErr)

		select {
		case querySem <- struct{}{}:
			defer func() { <-querySem }()
		default:
			return fmt.Errorf("query concurrency limit reached")
		}

		ctx, cancel := context.WithTimeout(context.Background(), queryHandlerTimeout)
		defer cancel()

		req, overlayIDBytes := overlay.UnwrapQuery(query.Data)
		if overlayIDBytes == nil || len(overlayIDBytes) != 32 {
			return nil
		}

		var overlayID [32]byte
		copy(overlayID[:], overlayIDBytes)

		rawQuery := extractRawTL(req)
		if rawQuery == nil {
			return nil
		}

		if clusterHandler != nil && overlayID == clusterOverlayID {
			if memberChecker == nil || !memberChecker.IsClusterMember(peerID) {
				logger.Debug("rejected overlay cluster query from non-member")
				return nil
			}
			resp, err := clusterHandler(ctx, rawQuery)
			if err != nil {
				return err
			}
			if resp != nil {
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

func makeRLDPHandler(overlays *OverlayManager, peer *overlay.RLDPWrapper, clusterOverlayID [32]byte, clusterHandler ClusterQueryHandler, memberChecker ClusterMemberChecker, peerID []byte, querySem chan struct{}, logger *slog.Logger) func(transferID []byte, query *rldp.Query) error {
	return func(transferID []byte, query *rldp.Query) (retErr error) {
		defer recoverPanic(logger, &retErr)

		select {
		case querySem <- struct{}{}:
			defer func() { <-querySem }()
		default:
			return fmt.Errorf("query concurrency limit reached")
		}

		ctx, cancel := context.WithTimeout(context.Background(), queryHandlerTimeout)
		defer cancel()

		req, overlayIDBytes := overlay.UnwrapQuery(query.Data)
		if overlayIDBytes == nil || len(overlayIDBytes) != 32 {
			logger.Debug("RLDP: no valid overlay in query")
			return nil
		}

		var overlayID [32]byte
		copy(overlayID[:], overlayIDBytes)

		rawQuery := extractRawTL(req)
		if rawQuery == nil {
			return nil
		}

		if clusterHandler != nil && overlayID == clusterOverlayID {
			if memberChecker == nil || !memberChecker.IsClusterMember(peerID) {
				logger.Debug("rejected RLDP cluster query from non-member")
				return nil
			}
			resp, err := clusterHandler(ctx, rawQuery)
			if err != nil {
				return err
			}
			if resp == nil {
				return nil
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

// recoverPanic catches panics in query handlers and converts them to errors.
// This prevents a single malformed message from crashing the ADNL server.
func recoverPanic(logger *slog.Logger, retErr *error) {
	if r := recover(); r != nil {
		logger.Error("panic in query handler", "recover", r)
		*retErr = fmt.Errorf("internal error: panic recovered")
	}
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
