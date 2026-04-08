package cluster

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
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

// handlerBundle holds all handler references that are set before the server
// starts accepting queries. Stored as a single atomic.Pointer to avoid
// data races between setter goroutines and query handler goroutines.
type handlerBundle struct {
	pieceHandler    PieceHandler
	rawQueryHandler RawQueryHandler
	ownerChecker    BagOwnershipChecker
	memberResolver  ClusterMemberResolver
}

// ClusterTransport handles ADNL communication for the cluster.
// Uses a dedicated client gateway to avoid handler conflicts with
// the server-side connection handler (both create overlay/RLDP stacks
// on ADNL peers, and creating two stacks on the same peer overwrites
// the custom message handler, breaking RLDP).
type ClusterTransport struct {
	serverGateway *adnl.Gateway
	clientGateway *adnl.Gateway
	server        *ionadnl.Server
	broadcaster   *ADNLBroadcaster
	dagService    *ADNLDAGService
	handlers      atomic.Pointer[handlerBundle]
	overlayID     []byte
	mu            sync.RWMutex
	reconnectWg   sync.WaitGroup
	peers         map[[32]byte]*clusterPeer
	logger        *slog.Logger
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

// loadHandlers returns the current handler bundle, never nil.
func (t *ClusterTransport) loadHandlers() handlerBundle {
	if h := t.handlers.Load(); h != nil {
		return *h
	}
	return handlerBundle{}
}

// updateHandlers applies a mutation to the handler bundle atomically.
func (t *ClusterTransport) updateHandlers(fn func(*handlerBundle)) {
	for {
		old := t.handlers.Load()
		var b handlerBundle
		if old != nil {
			b = *old
		}
		fn(&b)
		if t.handlers.CompareAndSwap(old, &b) {
			return
		}
	}
}

// SetPieceHandler registers the handler for forwarded piece requests.
func (t *ClusterTransport) SetPieceHandler(h PieceHandler) {
	t.updateHandlers(func(b *handlerBundle) { b.pieceHandler = h })
}

// SetRawQueryHandler registers the handler for forwarded raw storage queries.
func (t *ClusterTransport) SetRawQueryHandler(h RawQueryHandler) {
	t.updateHandlers(func(b *handlerBundle) { b.rawQueryHandler = h })
}

// SetOwnershipChecker registers the checker used to validate forwarded queries.
func (t *ClusterTransport) SetOwnershipChecker(c BagOwnershipChecker) {
	t.updateHandlers(func(b *handlerBundle) { b.ownerChecker = c })
}

// SetMemberResolver registers a resolver for checking cluster membership
// via CRDT nodeinfo entries. Used as a fallback when a peer is not in
// the local connected peers map (e.g., inbound connection before
// bidirectional setup completes).
func (t *ClusterTransport) SetMemberResolver(r ClusterMemberResolver) {
	t.updateHandlers(func(b *handlerBundle) { b.memberResolver = r })
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
	h := t.loadHandlers()
	if h.memberResolver != nil {
		return h.memberResolver.IsRegisteredNode(addr)
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

const fetchBlockPeerTimeout = 500 * time.Millisecond

// FetchBlockFromPeers fetches an IPLD block from cluster peers concurrently.
// Cancels remaining queries on first success. Tracks consecutive failures
// per peer and triggers reconnection for persistently dead connections.
func (t *ClusterTransport) FetchBlockFromPeers(ctx context.Context, cidBytes []byte) ([]byte, error) {
	t.mu.RLock()
	peers := make(map[[32]byte]*clusterPeer, len(t.peers))
	for k, v := range t.peers {
		peers[k] = v
	}
	t.mu.RUnlock()

	if len(peers) == 0 {
		return nil, fmt.Errorf("block not found on 0 peers")
	}

	type fetchResult struct {
		data []byte
		addr [32]byte
		err  error
	}

	fetchCtx, fetchCancel := context.WithCancel(ctx)
	defer fetchCancel()

	results := make(chan fetchResult, len(peers))
	msg := GetBlockMsg{CID: cidBytes}

	for addr, cp := range peers {
		go func(addr [32]byte, cp *clusterPeer) {
			peerCtx, peerCancel := context.WithTimeout(fetchCtx, fetchBlockPeerTimeout)
			defer peerCancel()
			var resp BlockMsg
			err := cp.adnlWrapper.Query(peerCtx, overlay.WrapQuery(t.overlayID, msg), &resp)
			results <- fetchResult{data: resp.Data, addr: addr, err: err}
		}(addr, cp)
	}

	var toReconnect [][32]byte
	var successCount int
	for range len(peers) {
		r := <-results
		if r.err != nil {
			t.logger.Debug("fetch block failed", "peer", r.addr[:4], "error", r.err)
			if t.trackPeerFailure(r.addr) {
				toReconnect = append(toReconnect, r.addr)
			}
			continue
		}
		successCount++
		t.resetPeerFailures(r.addr)
		if len(r.data) > 0 {
			fetchCancel()
			t.reconnectFailedPeers(toReconnect)
			return r.data, nil
		}
	}
	t.reconnectFailedPeers(toReconnect)
	if successCount == 0 {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("all %d peers failed with transport errors", len(peers))
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
