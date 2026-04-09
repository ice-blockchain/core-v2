package cluster

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
)

// PeerForwarder forwards requests to owning peers via the cluster transport.
type PeerForwarder interface {
	ForwardPieceViaPeer(ctx context.Context, adnlAddr [32]byte, bagID boc.BagID, pieceID int) (data []byte, proof []byte, err error)
	ForwardRawQuery(ctx context.Context, ownerADNLAddr [32]byte, bagID boc.BagID, rawQuery []byte) ([]byte, error)
}

// OwnerLookup resolves bag ownership and node addresses.
type OwnerLookup interface {
	Owner(bagID boc.BagID) string
	NodeADNLAddress(nodeID string) (adnlAddr [32]byte, ip string, port int, found bool)
}

// PieceForwarder forwards piece requests to the owning node.
type PieceForwarder struct {
	transport PeerForwarder
	lookup    OwnerLookup
	metrics   *ClusterMetrics
	logger    *slog.Logger
}

// NewPieceForwarder creates a piece forwarder.
func NewPieceForwarder(transport PeerForwarder, lookup OwnerLookup, metrics *ClusterMetrics, logger *slog.Logger) *PieceForwarder {
	return &PieceForwarder{
		transport: transport,
		lookup:    lookup,
		metrics:   metrics,
		logger:    logger,
	}
}

// ForwardGetPiece forwards a piece request to the owning node.
func (f *PieceForwarder) ForwardGetPiece(ctx context.Context, bagID boc.BagID, pieceID int) ([]byte, []byte, error) {
	start := time.Now()

	ownerNodeID := f.lookup.Owner(bagID)
	if ownerNodeID == "" {
		return nil, nil, fmt.Errorf("no owner for bag %x", bagID[:8])
	}

	adnlAddr, _, _, found := f.lookup.NodeADNLAddress(ownerNodeID)
	if !found {
		return nil, nil, fmt.Errorf("no address for owner node %s", ownerNodeID)
	}

	data, proof, err := f.transport.ForwardPieceViaPeer(ctx, adnlAddr, bagID, pieceID)
	if err != nil {
		return nil, nil, fmt.Errorf("forward to owner %s: %w", ownerNodeID, err)
	}

	f.recordMetrics(start)
	return data, proof, nil
}

// ForwardRawQuery forwards a raw storage query to the bag owner.
func (f *PieceForwarder) ForwardRawQuery(ctx context.Context, bagID boc.BagID, rawQuery []byte) ([]byte, error) {
	ownerNodeID := f.lookup.Owner(bagID)
	if ownerNodeID == "" {
		return nil, fmt.Errorf("no owner for bag %x", bagID[:8])
	}

	adnlAddr, _, _, found := f.lookup.NodeADNLAddress(ownerNodeID)
	if !found {
		return nil, fmt.Errorf("no address for owner node %s", ownerNodeID)
	}

	return f.transport.ForwardRawQuery(ctx, adnlAddr, bagID, rawQuery)
}

func (f *PieceForwarder) recordMetrics(start time.Time) {
	if f.metrics == nil {
		return
	}
	f.metrics.PieceForwardsTotal.WithLabelValues("sent").Inc()
	f.metrics.PieceForwardDuration.Observe(time.Since(start).Seconds())
}
