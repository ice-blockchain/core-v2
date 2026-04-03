package cluster

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// GatewayDialer opens ADNL connections to remote nodes.
type GatewayDialer interface {
	// QueryRemoteNode sends a TL query to a remote node and returns the response.
	// The implementation handles connection setup, RLDP framing, and timeouts.
	QueryRemoteNode(ctx context.Context, adnlAddr [32]byte, ip string, port int, query []byte) ([]byte, error)
}

// OwnerLookup resolves bag ownership and node addresses.
type OwnerLookup interface {
	Owner(bagID [32]byte) string
	NodeADNLAddress(nodeID string) (adnlAddr [32]byte, ip string, port int, found bool)
}

// PieceForwarder forwards piece requests to the owning node via direct ADNL.
type PieceForwarder struct {
	gateway GatewayDialer
	lookup  OwnerLookup
	metrics *ClusterMetrics
	logger  *slog.Logger
}

// NewPieceForwarder creates a piece forwarder.
func NewPieceForwarder(gateway GatewayDialer, lookup OwnerLookup, metrics *ClusterMetrics, logger *slog.Logger) *PieceForwarder {
	return &PieceForwarder{
		gateway: gateway,
		lookup:  lookup,
		metrics: metrics,
		logger:  logger,
	}
}

// ForwardGetPiece forwards a piece request to the owning node.
// Returns (pieceData, proof, error).
func (f *PieceForwarder) ForwardGetPiece(ctx context.Context, bagID [32]byte, pieceID int) ([]byte, []byte, error) {
	start := time.Now()

	ownerNodeID := f.lookup.Owner(bagID)
	if ownerNodeID == "" {
		return nil, nil, fmt.Errorf("no owner for bag %x", bagID[:8])
	}

	adnlAddr, ip, port, found := f.lookup.NodeADNLAddress(ownerNodeID)
	if !found {
		return nil, nil, fmt.Errorf("no address for owner node %s", ownerNodeID)
	}

	query := SerializeForwardPieceRequest(ForwardPieceRequest{
		BagID:   bagID,
		PieceID: int32(pieceID),
	})

	resp, err := f.gateway.QueryRemoteNode(ctx, adnlAddr, ip, port, query)
	if err != nil {
		return nil, nil, fmt.Errorf("query owner %s: %w", ownerNodeID, err)
	}

	pieceData, proof, found, err := ParsePieceResponse(resp)
	if err != nil {
		return nil, nil, fmt.Errorf("parse piece response: %w", err)
	}
	if !found {
		return nil, nil, fmt.Errorf("piece %d not found on owner %s", pieceID, ownerNodeID)
	}

	f.recordMetrics(start)
	return pieceData, proof, nil
}

func (f *PieceForwarder) recordMetrics(start time.Time) {
	if f.metrics == nil {
		return
	}
	f.metrics.PieceForwardsTotal.WithLabelValues("sent").Inc()
	f.metrics.PieceForwardDuration.Observe(time.Since(start).Seconds())
}
