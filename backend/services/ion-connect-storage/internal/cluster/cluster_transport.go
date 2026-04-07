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

const (
	// rldpMaxPieceAnswer is the max RLDP response size for piece forwarding (1MB).
	// Covers 128KB piece data + proof + TL overhead.
	rldpMaxPieceAnswer uint64 = 1 << 20

	// rldpMaxRawQueryAnswer is the max RLDP response size for raw query forwarding (256KB).
	rldpMaxRawQueryAnswer uint64 = 256 * 1024
)

// BagOwnershipChecker checks bag ownership state.
type BagOwnershipChecker interface {
	OwnsBag(bagID [32]byte) bool
	Owner(bagID [32]byte) string
}

// ClusterMemberResolver checks whether an ADNL address belongs to a
// registered cluster member (via CRDT nodeinfo entries).
type ClusterMemberResolver interface {
	IsRegisteredNode(adnlAddr [32]byte) bool
}

// PieceHandler serves a local piece request (used for forwarded pieces).
type PieceHandler func(ctx context.Context, bagID [32]byte, pieceID int) (data []byte, proof []byte, err error)

// RawQueryHandler handles a raw storage overlay query locally.
type RawQueryHandler func(ctx context.Context, bagID [32]byte, rawQuery []byte) ([]byte, error)

// ClusterTransport handles ADNL communication for the cluster.
// Uses a dedicated client gateway to avoid handler conflicts with
// the server-side connection handler (both create overlay/RLDP stacks
// on ADNL peers, and creating two stacks on the same peer overwrites
// the custom message handler, breaking RLDP).
type ClusterTransport struct {
	serverGateway   *adnl.Gateway
	clientGateway   *adnl.Gateway
	server          *ionadnl.Server
	broadcaster     *ADNLBroadcaster
	dagService      *ADNLDAGService
	pieceHandler    PieceHandler
	rawQueryHandler RawQueryHandler
	ownerChecker    BagOwnershipChecker
	memberResolver  ClusterMemberResolver
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
// Uses a separate client gateway for outgoing peer connections.
func NewClusterTransport(
	server *ionadnl.Server,
	overlayID [32]byte,
	broadcaster *ADNLBroadcaster,
	dagService *ADNLDAGService,
	logger *slog.Logger,
) (*ClusterTransport, error) {
	clientGateway, err := server.NewClientGateway()
	if err != nil {
		return nil, fmt.Errorf("cluster client gateway: %w", err)
	}
	return &ClusterTransport{
		serverGateway: server.Gateway(),
		clientGateway: clientGateway,
		server:        server,
		broadcaster:   broadcaster,
		dagService:    dagService,
		overlayID:     overlayID[:],
		peers:         make(map[[32]byte]*clusterPeer),
		logger:        logger,
	}, nil
}

// SetPieceHandler registers the handler for forwarded piece requests.
func (t *ClusterTransport) SetPieceHandler(h PieceHandler) {
	t.pieceHandler = h
}

// SetRawQueryHandler registers the handler for forwarded raw storage queries.
func (t *ClusterTransport) SetRawQueryHandler(h RawQueryHandler) {
	t.rawQueryHandler = h
}

// SetOwnershipChecker registers the checker used to validate forwarded queries.
func (t *ClusterTransport) SetOwnershipChecker(c BagOwnershipChecker) {
	t.ownerChecker = c
}

// SetMemberResolver registers a resolver for checking cluster membership
// via CRDT nodeinfo entries. Used as a fallback when a peer is not in
// the local connected peers map (e.g., inbound connection before
// bidirectional setup completes).
func (t *ClusterTransport) SetMemberResolver(r ClusterMemberResolver) {
	t.memberResolver = r
}

// RegisterWithServer registers the cluster overlay query handler
// and the cluster member checker for peer authentication.
func (t *ClusterTransport) RegisterWithServer() {
	var oid [32]byte
	copy(oid[:], t.overlayID)
	t.server.SetClusterOverlay(oid, t.handleClusterQuery)
	t.server.SetClusterMemberChecker(t)
}

// IsClusterMember returns true if the peer identified by adnlAddr is
// a known cluster member. Checks the local connected peers map first,
// then falls back to CRDT nodeinfo entries for inbound connections
// that haven't been bidirectionally established yet.
func (t *ClusterTransport) IsClusterMember(adnlAddr []byte) bool {
	var addr [32]byte
	copy(addr[:], adnlAddr)
	t.mu.RLock()
	_, ok := t.peers[addr]
	t.mu.RUnlock()
	if ok {
		return true
	}
	if t.memberResolver != nil {
		return t.memberResolver.IsRegisteredNode(addr)
	}
	return false
}

func (t *ClusterTransport) handleClusterQuery(ctx context.Context, rawQuery []byte) ([]byte, error) {
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
		if t.ownerChecker == nil || !t.ownerChecker.OwnsBag(bagID) {
			t.logger.Debug("rejected forwarded raw query for non-owned bag", "bag", bagID[:4])
			return tl.Serialize(ForwardRawResponseMsg{}, true)
		}
		resp, qErr := t.rawQueryHandler(ctx, bagID, fwdRaw.RawQuery)
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
		if t.ownerChecker == nil || !t.ownerChecker.OwnsBag(bagID) {
			t.logger.Debug("rejected forwarded piece request for non-owned bag", "bag", bagID[:4])
			return tl.Serialize(PieceNotFoundMsg{}, true)
		}
		data, proof, pErr := t.pieceHandler(ctx, bagID, int(fwdReq.PieceID))
		if pErr != nil {
			t.logger.Debug("forward piece handler error", "error", pErr)
			return tl.Serialize(PieceNotFoundMsg{}, true)
		}
		return tl.Serialize(PieceResponseMsg{Data: data, Proof: proof}, true)
	}

	var ownerCheck OwnerCheckMsg
	if _, err := tl.Parse(&ownerCheck, rawQuery, true); err == nil {
		var bagID [32]byte
		copy(bagID[:], ownerCheck.BagID)
		owner := ""
		if t.ownerChecker != nil {
			owner = t.ownerChecker.Owner(bagID)
		}
		return tl.Serialize(OwnerCheckResponseMsg{Owner: owner}, true)
	}

	return nil, fmt.Errorf("unknown cluster query")
}

const broadcastPeerTimeout = 3 * time.Second

// BroadcastToCluster sends a CRDT head notification to all cluster peers.
// Uses ADNL overlay query with per-peer timeout to prevent goroutine leaks.
func (t *ClusterTransport) BroadcastToCluster(ctx context.Context, data []byte) error {
	t.mu.RLock()
	peers := make(map[[32]byte]*clusterPeer, len(t.peers))
	for k, v := range t.peers {
		peers[k] = v
	}
	t.mu.RUnlock()

	var wg sync.WaitGroup
	msg := CRDTHeadMsg{Data: data}
	for addr, cp := range peers {
		wg.Add(1)
		go func(addr [32]byte, cp *clusterPeer) {
			defer func() {
				if r := recover(); r != nil {
					t.logger.Error("panic in broadcast goroutine", "peer", addr[:4], "recover", r)
				}
				wg.Done()
			}()
			peerCtx, cancel := context.WithTimeout(ctx, broadcastPeerTimeout)
			defer cancel()
			var ack BlockMsg
			if err := cp.adnlWrapper.Query(peerCtx, overlay.WrapQuery(t.overlayID, msg), &ack); err != nil {
				t.logger.Debug("broadcast failed", "peer", addr[:4], "error", err)
			}
		}(addr, cp)
	}
	wg.Wait()
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
// using RLDP over the cluster overlay. RLDP is required because piece
// payloads (128KB) exceed the ADNL message size limit.
func (t *ClusterTransport) ForwardPieceViaPeer(ctx context.Context, adnlAddr [32]byte, bagID [32]byte, pieceID int) ([]byte, []byte, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	cp, ok := t.peers[adnlAddr]
	if !ok {
		return nil, nil, fmt.Errorf("peer %x not connected", adnlAddr[:4])
	}

	msg := ForwardPieceRequestMsg{BagID: bagID[:], PieceID: int32(pieceID)}
	var resp PieceResponseMsg
	err := cp.rldpWrapper.DoQuery(ctx, rldpMaxPieceAnswer, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		return nil, nil, fmt.Errorf("forward piece query: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, nil, fmt.Errorf("piece not found on owner")
	}
	return resp.Data, resp.Proof, nil
}

// maxForwardQuerySize is the maximum raw query payload that will be forwarded
// to a cluster peer. Prevents amplification attacks via oversized queries.
const maxForwardQuerySize = 64 * 1024

// ForwardRawQuery forwards a raw storage query to the bag owner via the
// cluster overlay. Uses ADNL (responses are small control messages).
func (t *ClusterTransport) ForwardRawQuery(ctx context.Context, ownerADNLAddr [32]byte, bagID [32]byte, rawQuery []byte) ([]byte, error) {
	if len(rawQuery) > maxForwardQuerySize {
		return nil, fmt.Errorf("raw query too large: %d bytes (max %d)", len(rawQuery), maxForwardQuerySize)
	}
	t.mu.RLock()
	defer t.mu.RUnlock()
	cp, ok := t.peers[ownerADNLAddr]
	if !ok {
		return nil, fmt.Errorf("owner peer %x not connected", ownerADNLAddr[:4])
	}

	t.logger.Debug("forwarding raw query to owner", "owner", ownerADNLAddr[:4], "query_len", len(rawQuery))
	msg := ForwardRawQueryMsg{BagID: bagID[:], RawQuery: rawQuery}

	queryCtx, queryCancel := context.WithTimeout(ctx, 15*time.Second)
	defer queryCancel()

	var resp ForwardRawResponseMsg
	err := cp.adnlWrapper.Query(queryCtx, overlay.WrapQuery(t.overlayID, msg), &resp)
	if err != nil {
		t.logger.Debug("forward raw query failed", "error", err)
		return nil, fmt.Errorf("forward raw query: %w", err)
	}
	t.logger.Debug("forward raw query success", "resp_len", len(resp.Data))
	return resp.Data, nil
}

const ownerCheckTimeout = 5 * time.Second

// QueryPeerOwnership asks all connected cluster peers who they believe
// owns a bag. Returns a slice of owner nodeIDs (one per responding peer).
func (t *ClusterTransport) QueryPeerOwnership(ctx context.Context, bagID [32]byte) []string {
	t.mu.RLock()
	peers := make([]*clusterPeer, 0, len(t.peers))
	for _, p := range t.peers {
		peers = append(peers, p)
	}
	t.mu.RUnlock()

	if len(peers) == 0 {
		return nil
	}

	qCtx, cancel := context.WithTimeout(ctx, ownerCheckTimeout)
	defer cancel()

	msg := OwnerCheckMsg{BagID: bagID[:]}

	var mu sync.Mutex
	var results []string
	var wg sync.WaitGroup
	for _, cp := range peers {
		wg.Add(1)
		go func(cp *clusterPeer) {
			defer wg.Done()
			var resp OwnerCheckResponseMsg
			if err := cp.adnlWrapper.Query(qCtx, overlay.WrapQuery(t.overlayID, msg), &resp); err != nil {
				return
			}
			mu.Lock()
			results = append(results, resp.Owner)
			mu.Unlock()
		}(cp)
	}
	wg.Wait()
	return results
}

// ConnectToPeer establishes an ADNL connection to the remote peer using
// the dedicated client gateway. This ensures the overlay/RLDP wrappers
// don't conflict with the server-side wrappers created by handleNewConnection.
func (t *ClusterTransport) ConnectToPeer(addr string, pubKey ed25519.PublicKey) (adnl.Peer, error) {
	rawPeer, err := t.clientGateway.RegisterClient(addr, pubKey)
	if err != nil {
		return nil, fmt.Errorf("connect to peer %s: %w", addr, err)
	}

	extADNL := overlay.CreateExtendedADNL(rawPeer)
	extRLDP := overlay.CreateExtendedRLDP(rldp.NewClientV2(extADNL))

	var adnlAddr [32]byte
	copy(adnlAddr[:], rawPeer.GetID())

	t.mu.Lock()
	t.peers[adnlAddr] = &clusterPeer{
		adnlWrapper: extADNL,
		rldpWrapper: extRLDP,
	}
	peerCount := len(t.peers)
	t.mu.Unlock()

	t.logger.Info("cluster peer connected", "addr", addr, "total", peerCount)
	return rawPeer, nil
}
