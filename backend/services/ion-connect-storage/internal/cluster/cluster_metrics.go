package cluster

import "github.com/prometheus/client_golang/prometheus"

// ClusterMetrics holds Prometheus metrics for cluster coordination.
type ClusterMetrics struct {
	NodesActive           prometheus.Gauge
	BagsOwned             prometheus.Gauge
	CRDTDeltasSent        prometheus.Counter
	CRDTDeltasReceived    prometheus.Counter
	ConflictsResolved     prometheus.Counter
	PieceForwardsTotal    *prometheus.CounterVec
	PieceForwardDuration  prometheus.Histogram
	ActivePeerConnections prometheus.Gauge
}

// RegisterClusterMetrics creates and registers all cluster metrics on the given registry.
func RegisterClusterMetrics(registry *prometheus.Registry) *ClusterMetrics {
	m := &ClusterMetrics{}

	m.NodesActive = registerClusterGauge(registry,
		"cluster_nodes_active", "Number of cluster nodes with fresh heartbeats")

	m.BagsOwned = registerClusterGauge(registry,
		"cluster_bags_owned", "Bags owned by this node")

	m.CRDTDeltasSent = registerClusterCounter(registry,
		"cluster_crdt_deltas_sent", "CRDT delta broadcasts sent")

	m.CRDTDeltasReceived = registerClusterCounter(registry,
		"cluster_crdt_deltas_received", "CRDT delta broadcasts received")

	m.ConflictsResolved = registerClusterCounter(registry,
		"cluster_conflicts_resolved", "CRDT ownership conflict resolutions")

	m.PieceForwardsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "cluster_piece_forwards_total",
		Help: "Inter-node piece forwarding count",
	}, []string{"direction"})
	registry.MustRegister(m.PieceForwardsTotal)

	m.PieceForwardDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "cluster_piece_forward_duration_seconds",
		Help:    "Piece forwarding latency including remote fetch",
		Buckets: prometheus.DefBuckets,
	})
	registry.MustRegister(m.PieceForwardDuration)

	m.ActivePeerConnections = registerClusterGauge(registry,
		"cluster_active_peer_connections", "Direct ADNL connections to cluster peers")

	return m
}

func registerClusterGauge(reg *prometheus.Registry, name, help string) prometheus.Gauge {
	g := prometheus.NewGauge(prometheus.GaugeOpts{Name: name, Help: help})
	reg.MustRegister(g)
	return g
}

func registerClusterCounter(reg *prometheus.Registry, name, help string) prometheus.Counter {
	c := prometheus.NewCounter(prometheus.CounterOpts{Name: name, Help: help})
	reg.MustRegister(c)
	return c
}
