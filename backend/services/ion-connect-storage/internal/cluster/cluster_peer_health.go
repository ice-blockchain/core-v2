package cluster

import "time"

const maxPeerFailures = 3

// trackPeerFailure increments the fail counter for a peer and returns
// true if the peer should be reconnected.
func (t *ClusterTransport) trackPeerFailure(addr [32]byte) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	p, ok := t.peers[addr]
	if !ok {
		return false
	}
	p.failCount++
	return p.failCount >= maxPeerFailures && time.Since(p.lastReconnect) > 5*time.Second
}

// resetPeerFailures clears the fail counter for a responsive peer.
func (t *ClusterTransport) resetPeerFailures(addr [32]byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if p, ok := t.peers[addr]; ok {
		p.failCount = 0
	}
}

// reconnectPeer re-establishes a dead peer connection.
// The old entry is kept in the map during reconnect so that concurrent
// readers (BroadcastToCluster, FetchBlockFromPeers) that captured the
// pointer can still use it (their queries will fail with a timeout
// rather than a crash). The old entry is removed only after the new
// connection is established (or on failure).
func (t *ClusterTransport) reconnectPeer(addr [32]byte) {
	t.mu.Lock()
	cp, ok := t.peers[addr]
	if !ok {
		t.mu.Unlock()
		return
	}
	peerAddr := cp.addr
	peerPubKey := cp.pubKey
	// Reset fail count to prevent concurrent reconnect attempts.
	cp.failCount = 0
	cp.lastReconnect = time.Now()
	t.mu.Unlock()

	if peerAddr == "" || peerPubKey == nil {
		return
	}
	t.logger.Info("reconnecting dead peer", "addr", peerAddr)
	_, err := t.ConnectToPeer(peerAddr, peerPubKey)

	// Always remove old entry -- ConnectToPeer inserts at the new ADNL addr key.
	t.mu.Lock()
	delete(t.peers, addr)
	t.mu.Unlock()

	if err != nil {
		t.logger.Warn("peer reconnect failed", "addr", peerAddr, "error", err)
	}
}
