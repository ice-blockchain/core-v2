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
	adnlWrapper   *overlay.ADNLWrapper
	rldpWrapper   *overlay.RLDPWrapper
	addr          string
	pubKey        ed25519.PublicKey
	failCount     int
	lastReconnect time.Time
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

const broadcastPeerTimeout = 3 * time.Second

// BroadcastToCluster sends a CRDT head notification to all cluster peers.
// Uses ADNL overlay query with per-peer timeout to prevent goroutine leaks.
// Tracks consecutive failures per peer and triggers reconnection for dead connections.
func (t *ClusterTransport) BroadcastToCluster(ctx context.Context, data []byte) error {
	t.mu.RLock()
	peers := make(map[[32]byte]*clusterPeer, len(t.peers))
	for k, v := range t.peers {
		peers[k] = v
	}
	t.mu.RUnlock()

	var wg sync.WaitGroup
	var reconnectMu sync.Mutex
	var toReconnect [][32]byte
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
				if t.trackPeerFailure(addr) {
					reconnectMu.Lock()
					toReconnect = append(toReconnect, addr)
					reconnectMu.Unlock()
				}
			} else {
				t.resetPeerFailures(addr)
			}
		}(addr, cp)
	}
	wg.Wait()
	for _, addr := range toReconnect {
		t.reconnectPeer(addr)
	}
	return nil
}

// FetchBlockFromPeers fetches an IPLD block from cluster peers.
// Tracks consecutive failures per peer and triggers reconnection for
// persistently dead connections.
func (t *ClusterTransport) FetchBlockFromPeers(ctx context.Context, cidBytes []byte) ([]byte, error) {
	t.mu.RLock()
	peers := make(map[[32]byte]*clusterPeer, len(t.peers))
	for k, v := range t.peers {
		peers[k] = v
	}
	t.mu.RUnlock()

	msg := GetBlockMsg{CID: cidBytes}
	var toReconnect [][32]byte
	for addr, cp := range peers {
		fetchCtx, fetchCancel := context.WithTimeout(ctx, 3*time.Second)
		var resp BlockMsg
		err := cp.adnlWrapper.Query(fetchCtx, overlay.WrapQuery(t.overlayID, msg), &resp)
		fetchCancel()
		if err != nil {
			t.logger.Debug("fetch block failed", "peer", addr[:4], "error", err)
			if t.trackPeerFailure(addr) {
				toReconnect = append(toReconnect, addr)
			}
			continue
		}
		t.resetPeerFailures(addr)
		if len(resp.Data) > 0 {
			return resp.Data, nil
		}
	}
	for _, addr := range toReconnect {
		t.reconnectPeer(addr)
	}
	return nil, fmt.Errorf("block not found on %d peers", len(peers))
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
		addr:        addr,
		pubKey:      pubKey,
	}
	peerCount := len(t.peers)
	t.mu.Unlock()

	t.logger.Info("cluster peer connected", "addr", addr, "total", peerCount)
	return rawPeer, nil
}
