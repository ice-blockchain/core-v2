package cluster

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
)

// PeerBroadcaster defines how to send messages to all cluster peers.
// Implemented by the Coordinator using ADNL overlay broadcast.
type PeerBroadcaster interface {
	BroadcastToCluster(ctx context.Context, data []byte) error
}

// ADNLBroadcaster implements go-ds-crdt's Broadcaster interface.
// Sends head CID notifications to cluster peers and receives them.
type ADNLBroadcaster struct {
	peer     atomic.Value // stores PeerBroadcaster
	incoming chan []byte
	closed   chan struct{}
	once     sync.Once
	dropped  atomic.Int64
	logger   *slog.Logger
}

// NewADNLBroadcaster creates a broadcaster backed by ADNL overlay messaging.
func NewADNLBroadcaster(peer PeerBroadcaster, logger *slog.Logger) *ADNLBroadcaster {
	b := &ADNLBroadcaster{
		incoming: make(chan []byte, 4096),
		closed:   make(chan struct{}),
		logger:   logger,
	}
	if peer != nil {
		b.peer.Store(peer)
	}
	return b
}

// SetPeer atomically updates the peer broadcaster.
func (b *ADNLBroadcaster) SetPeer(p PeerBroadcaster) {
	b.peer.Store(p)
}

// Broadcast sends a head CID notification to all cluster peers.
// Wraps the raw CID bytes in the cluster.crdtHead TL message.
func (b *ADNLBroadcaster) Broadcast(ctx context.Context, data []byte) error {
	select {
	case <-b.closed:
		return fmt.Errorf("broadcaster closed")
	default:
	}

	p, _ := b.peer.Load().(PeerBroadcaster)
	if p == nil {
		return nil // no-op if no peer broadcaster configured (single-node/test)
	}
	// Pass raw data -- the transport handles TL wrapping via CRDTHeadMsg.
	if err := p.BroadcastToCluster(ctx, data); err != nil {
		b.logger.Warn("broadcast crdt head failed", "error", err)
		return err
	}
	return nil
}

// Next blocks until the next head CID arrives or the broadcaster is closed.
// Called by go-ds-crdt in a loop.
func (b *ADNLBroadcaster) Next(ctx context.Context) ([]byte, error) {
	select {
	case data := <-b.incoming:
		return data, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-b.closed:
		return nil, fmt.Errorf("broadcaster closed")
	}
}

// HandleIncoming processes an incoming TL-encoded CRDT head message from a peer.
func (b *ADNLBroadcaster) HandleIncoming(rawMessage []byte) {
	headCID, err := ParseCRDTHead(rawMessage)
	if err != nil {
		b.logger.Warn("parse incoming crdt head", "error", err)
		return
	}
	b.enqueueHead(headCID)
}

// HandleIncomingRaw processes raw CID bytes from a typed TL message.
func (b *ADNLBroadcaster) HandleIncomingRaw(headCID []byte) {
	b.enqueueHead(headCID)
}

func (b *ADNLBroadcaster) enqueueHead(headCID []byte) {
	select {
	case b.incoming <- headCID:
	default:
		count := b.dropped.Add(1)
		b.logger.Warn("incoming crdt head channel full, dropping", "total_dropped", count)
	}
}

// DroppedCount returns the total number of CRDT head messages dropped.
func (b *ADNLBroadcaster) DroppedCount() int64 { return b.dropped.Load() }

// Close stops the broadcaster.
func (b *ADNLBroadcaster) Close() {
	b.once.Do(func() {
		close(b.closed)
	})
}
