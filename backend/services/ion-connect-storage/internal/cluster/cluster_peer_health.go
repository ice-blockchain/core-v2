package cluster

import "time"

const maxPeerFailures = 3

// trackPeerFailure increments the fail counter for a peer and returns
// true if the peer should be reconnected. Resets the counter and updates
// lastReconnect atomically under the lock so only one caller wins.
func (t *ClusterTransport) trackPeerFailure(addr [32]byte) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	p, ok := t.peers[addr]
	if !ok {
		return false
	}
	p.failCount++
	if p.failCount >= maxPeerFailures && time.Since(p.lastReconnect) > 5*time.Second {
		p.failCount = 0
		p.lastReconnect = time.Now()
		return true
	}
	return false
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
	t.mu.Unlock()

	if peerAddr == "" || peerPubKey == nil {
		return
	}
	t.logger.Info("reconnecting dead peer", "addr", peerAddr)
	newPeer, err := t.ConnectToPeer(peerAddr, peerPubKey)

	// Only remove old entry when reconnect succeeded and the ADNL addr changed.
	if err == nil && newPeer != nil {
		var newAddr [32]byte
		copy(newAddr[:], newPeer.GetID())
		if newAddr != addr {
			t.mu.Lock()
			delete(t.peers, addr)
			t.mu.Unlock()
		}
	}
	if err != nil {
		t.logger.Warn("peer reconnect failed", "addr", peerAddr, "error", err)
	}
}

// reconnectFailedPeers spawns reconnections in a tracked goroutine.
func (t *ClusterTransport) reconnectFailedPeers(addrs [][32]byte) {
	if len(addrs) == 0 {
		return
	}
	t.reconnectWg.Add(1)
	go func() {
		defer t.reconnectWg.Done()
		for _, a := range addrs {
			t.reconnectPeer(a)
		}
	}()
}
