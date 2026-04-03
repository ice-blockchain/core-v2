package metrics

import (
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/cluster"
	"github.com/prometheus/client_golang/prometheus"
)

// Metrics holds all Prometheus metrics for ion-connect-storage.
type Metrics struct {
	BagsRegistered          prometheus.Gauge
	BagsDownloading         prometheus.Gauge
	ActiveTransfers         prometheus.Gauge
	CacheEntries            prometheus.Gauge
	CacheHits               prometheus.Counter
	CacheMisses             prometheus.Counter
	CacheEvictions          prometheus.Counter
	GreenfieldFetchTotal    *prometheus.CounterVec
	GreenfieldFetchDuration *prometheus.HistogramVec
	IndexEntries            prometheus.Gauge
	ProviderLookups         prometheus.Counter
	ProviderRegistrations   prometheus.Gauge
	Cluster                 *cluster.ClusterMetrics

	registry *prometheus.Registry
}

// NewMetrics creates and registers all metrics.
func NewMetrics() *Metrics {
	reg := prometheus.NewRegistry()
	m := &Metrics{registry: reg}

	m.BagsRegistered = registerGauge(reg, "bags_registered_total", "Total bags registered in DHT")
	m.BagsDownloading = registerGauge(reg, "bags_downloading", "Bags currently being downloaded")
	m.ActiveTransfers = registerGauge(reg, "ion_storage_active_transfers", "Active piece transfers")
	m.CacheEntries = registerGauge(reg, "cache_entries_total", "Total entries in segment cache")
	m.CacheHits = registerCounter(reg, "cache_hit_total", "Cache hit count")
	m.CacheMisses = registerCounter(reg, "cache_miss_total", "Cache miss count")
	m.CacheEvictions = registerCounter(reg, "cache_evictions_total", "Cache eviction count")
	m.IndexEntries = registerGauge(reg, "index_entries_total", "Total entries in bag index")
	m.ProviderLookups = registerCounter(reg, "provider_lookups_total", "Provider index lookup count")
	m.ProviderRegistrations = registerGauge(reg, "provider_registrations_total", "Provider index registration count")

	m.GreenfieldFetchTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "greenfield_fetch_total",
		Help: "Greenfield fetch count by type and status",
	}, []string{"type", "status"})
	reg.MustRegister(m.GreenfieldFetchTotal)

	m.GreenfieldFetchDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "greenfield_fetch_duration_seconds",
		Help:    "Greenfield fetch duration by type",
		Buckets: prometheus.DefBuckets,
	}, []string{"type"})
	reg.MustRegister(m.GreenfieldFetchDuration)

	m.Cluster = cluster.RegisterClusterMetrics(reg)

	return m
}

// Registry returns the custom Prometheus registry.
func (m *Metrics) Registry() *prometheus.Registry {
	return m.registry
}

func registerGauge(reg *prometheus.Registry, name, help string) prometheus.Gauge {
	g := prometheus.NewGauge(prometheus.GaugeOpts{Name: name, Help: help})
	reg.MustRegister(g)
	return g
}

func registerCounter(reg *prometheus.Registry, name, help string) prometheus.Counter {
	c := prometheus.NewCounter(prometheus.CounterOpts{Name: name, Help: help})
	reg.MustRegister(c)
	return c
}
