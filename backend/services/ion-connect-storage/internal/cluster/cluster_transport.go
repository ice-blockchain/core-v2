package cluster

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"sync"
	"time"

	ionadnl "github.com/ice-blockchain/ion/services/ion-connect-storage/internal/adnl"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/overlay"
	"github.com/xssnick/tonutils-go/adnl/rldp"
	"github.com/xssnick/tonutils-go/tl"
)

// PieceHandler serves a local piece request (used for forwarded pieces).
type PieceHandler func(ctx context.Context, bagID [32]byte, pieceID int) (data []byte, proof []byte, err error)

// RawQueryHandler handles a raw storage overlay query locally.
type RawQueryHandler func(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error)

// ClusterTransport handles ADNL communication for the cluster.
// Uses overlay-wrapped queries (same mechanism as tonutils-storage).
type ClusterTransport struct {
	gateway         *adnl.Gateway
	server          *ionadnl.Server
	broadcaster     *ADNLBroadcaster
	dagService      *ADNLDAGService
	pieceHandler    PieceHandler
	rawQueryHandler RawQueryHandler
	overlayID       []byte
	mu              sync.RWMutex
	peers           map[[32]byte]*clusterPeer
	logger          *slog.Logger
}

type clusterPeer struct {
	adnlWrapper *overlay.ADNLWrapper
	rldpWrapper *overlay.RLDPWrapper
}

// NewClusterTransport creates a transport using overlay-wrapped queries.
func NewClusterTransport(
	server *ionadnl.Server,
	overlayID [32]byte,
	broadcaster *ADNLBroadcaster,
	dagService *ADNLDAGService,
	logger *slog.Logger,
) *ClusterTransport {
	return &ClusterTransport{
		gateway:     server.Gateway(),
		server:      server,
		broadcaster: broadcaster,
		dagService:  dagService,
		overlayID:   overlayID[:],
		peers:       make(map[[32]byte]*clusterPeer),
		logger:      logger,
	}
}

// SetPieceHandler registers the handler for forwarded piece requests.
func (t *ClusterTransport) SetPieceHandler(h PieceHandler) {
	t.pieceHandler = h
}

// SetRawQueryHandler registers the handler for forwarded raw storage queries.
func (t *ClusterTransport) SetRawQueryHandler(h RawQueryHandler) {
	t.rawQueryHandler = h
}

// RegisterWithServer registers the cluster overlay query handler.
func (t *ClusterTransport) RegisterWithServer() {
	var oid [32]byte
	copy(oid[:], t.overlayID)
	t.server.SetClusterOverlay(oid, t.handleClusterQuery)
}

func (t *ClusterTransport) handleClusterQuery(_ context.Context, rawQuery []byte) ([]byte, error) {
	if len(rawQuery) < 4 {
		return nil, fmt.Errorf("cluster query too short")
	}

	var headMsg CRDTHeadMsg
	if _, err := tl.Parse(&headMsg, rawQuery, true); err == nil {
		t.broadcaster.HandleIncomingRaw(headMsg.Data)
		return tl.Serialize(BlockMsg{}, true)
	}

	var getBlock GetBlockMsg
	if _, err := tl.Parse(&getBlock, rawQuery, true); err == nil {
		blockResp := t.dagService.HandleGetBlock(getBlock.CID)
		data, found, parseErr := ParseBlockResponse(blockResp)
		if parseErr != nil || !found {
			return tl.Serialize(BlockMsg{Data: nil}, true)
		}
		return tl.Serialize(BlockMsg{Data: data}, true)
	}

	var fwdRaw ForwardRawQueryMsg
	if _, err := tl.Parse(&fwdRaw, rawQuery, true); err == nil {
		if t.rawQueryHandler == nil {
			return tl.Serialize(ForwardRawResponseMsg{}, true)
		}
		var bagID [32]byte
		copy(bagID[:], fwdRaw.BagID)
		resp, qErr := t.rawQueryHandler(context.Background(), bagID, fwdRaw.RawQuery)
		if qErr != nil {
			return tl.Serialize(ForwardRawResponseMsg{}, true)
		}
		return tl.Serialize(ForwardRawResponseMsg{Data: resp}, true)
	}

	var fwdReq ForwardPieceRequestMsg
	if _, err := tl.Parse(&fwdReq, rawQuery, true); err == nil {
		if t.pieceHandler == nil {
			return tl.Serialize(PieceNotFoundMsg{}, true)
		}
		var bagID [32]byte
		copy(bagID[:], fwdReq.BagID)
		data, proof, pErr := t.pieceHandler(context.Background(), bagID, int(fwdReq.PieceID))
		if pErr != nil {
			t.logger.Debug("forward piece handler error", "error", pErr)
			return tl.Serialize(PieceNotFoundMsg{}, true)
		}
		return tl.Serialize(PieceResponseMsg{Data: data, Proof: proof}, true)
	}

	return nil, fmt.Errorf("unknown cluster query")
}

// BroadcastToCluster sends a CRDT head notification to all cluster peers.
// Uses ADNL overlay query (same as tonutils-storage Ping).
func (t *ClusterTransport) BroadcastToCluster(ctx context.Context, data []byte) error {
	t.mu.RLock()
	defer t.mu.RUnlock()

	msg := CRDTHeadMsg{Data: data}
	for addr, cp := range t.peers {
		go func(addr [32]byte, cp *clusterPeer) {
			var ack BlockMsg
			if err := cp.adnlWrapper.Query(ctx, overlay.WrapQuery(t.overlayID, msg), &ack); err != nil {
				t.logger.Debug("broadcast failed", "peer", addr[:4], "error", err)
			}
		}(addr, cp)
	}
	return nil
}

// FetchBlockFromPeers fetches an IPLD block from cluster peers.
// Uses ADNL overlay query (same as tonutils-storage GetRandomPeers).
func (t *ClusterTransport) FetchBlockFromPeers(ctx context.Context, cidBytes []byte) ([]byte, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	msg := GetBlockMsg{CID: cidBytes}
	for addr, cp := range t.peers {
		fetchCtx, fetchCancel := context.WithTimeout(ctx, 3*time.Second)
		var resp BlockMsg
		err := cp.adnlWrapper.Query(fetchCtx, overlay.WrapQuery(t.overlayID, msg), &resp)
		fetchCancel()
		if err != nil {
			t.logger.Debug("fetch block failed", "peer", addr[:4], "error", err)
			continue
		}
		if len(resp.Data) > 0 {
			return resp.Data, nil
		}
	}
	return nil, fmt.Errorf("block not found on %d peers", len(t.peers))
}

// ForwardPieceViaPeer sends a ForwardPieceRequest to a specific peer
// using the overlay-wrapped ADNL connection.
func (t *ClusterTransport) ForwardPieceViaPeer(ctx context.Context, adnlAddr [32]byte, bagID [32]byte, pieceID int) ([]byte, []byte, error) {
	t.mu.RLock()
	cp, ok := t.peers[adnlAddr]
	t.mu.RUnlock()
	if !ok {
		return nil, nil, fmt.Errorf("peer %x not connected", adnlAddr[:4])
	}

	msg := ForwardPieceRequestMsg{BagID: bagID[:], PieceID: int32(pieceID)}
	var resp PieceResponseMsg
	err := cp.adnlWrapper.Query(ctx, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		return nil, nil, fmt.Errorf("forward piece query: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, nil, fmt.Errorf("piece not found on owner")
	}
	return resp.Data, resp.Proof, nil
}

// ForwardRawQuery forwards a raw storage query to the bag owner via the cluster overlay.
func (t *ClusterTransport) ForwardRawQuery(ctx context.Context, ownerADNLAddr [32]byte, bagID [32]byte, rawQuery []byte) ([]byte, error) {
	t.mu.RLock()
	cp, ok := t.peers[ownerADNLAddr]
	t.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("owner peer %x not connected", ownerADNLAddr[:4])
	}

	msg := ForwardRawQueryMsg{BagID: bagID[:], RawQuery: rawQuery}
	var resp ForwardRawResponseMsg
	err := cp.adnlWrapper.Query(ctx, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		return nil, fmt.Errorf("forward raw query: %w", err)
	}
	return resp.Data, nil
}

// ConnectToPeer establishes an ADNL connection with overlay wrappers.
// This mirrors tonutils-storage's bootstrapPeer: creates ADNLWrapper + RLDPWrapper.
func (t *ClusterTransport) ConnectToPeer(addr string, pubKey ed25519.PublicKey) (adnl.Peer, error) {
	rawPeer, err := t.gateway.RegisterClient(addr, pubKey)
	if err != nil {
		return nil, fmt.Errorf("connect to peer %s: %w", addr, err)
	}

	// Create overlay wrappers (same as tonutils-storage server.bootstrapPeer).
	extADNL := overlay.CreateExtendedADNL(rawPeer)
	extRLDP := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))

	var adnlAddr [32]byte
	copy(adnlAddr[:], rawPeer.GetID())

	t.mu.Lock()
	t.peers[adnlAddr] = &clusterPeer{
		adnlWrapper: extADNL,
		rldpWrapper: extRLDP,
	}
	t.mu.Unlock()

	t.logger.Info("cluster peer connected", "addr", addr, "total", len(t.peers))
	return rawPeer, nil
}
