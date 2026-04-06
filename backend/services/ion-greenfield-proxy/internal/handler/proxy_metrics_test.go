package handler

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"io"
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/require"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func counterValue(cv *prometheus.CounterVec, labels ...string) float64 {
	m := &dto.Metric{}
	c, err := cv.GetMetricWithLabelValues(labels...)
	if err != nil {
		return 0
	}
	_ = c.(prometheus.Metric).Write(m)
	return m.GetCounter().GetValue()
}

func histogramCount(hv *prometheus.HistogramVec, labels ...string) uint64 {
	m := &dto.Metric{}
	h, err := hv.GetMetricWithLabelValues(labels...)
	if err != nil {
		return 0
	}
	_ = h.(prometheus.Metric).Write(m)
	return m.GetHistogram().GetSampleCount()
}

func newTestMetrics() *proxyMetrics {
	return &proxyMetrics{
		upstreamErrors: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "test_upstream_errors",
		}, []string{"upstream"}),
		upstreamResponseTime: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name: "test_upstream_response_time",
		}, []string{"upstream"}),
		label: "rpc",
	}
}

func TestProxyMetrics_ConnectionErrorIncrementsCounter(t *testing.T) {
	t.Parallel()

	// Start and immediately close upstream to simulate connection refused.
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	upstreamURL, _ := url.Parse(upstream.URL)
	upstream.Close()

	pm := newTestMetrics()
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadGateway, w.Code)
	require.Equal(t, float64(1), counterValue(pm.upstreamErrors, "rpc"))
}

func TestProxyMetrics_5xxIncrementsCounter(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer upstream.Close()
	upstreamURL, _ := url.Parse(upstream.URL)

	pm := newTestMetrics()
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	require.Equal(t, float64(1), counterValue(pm.upstreamErrors, "rpc"))
}

func TestProxyMetrics_2xxDoesNotIncrementErrorCounter(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	upstreamURL, _ := url.Parse(upstream.URL)

	pm := newTestMetrics()
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, float64(0), counterValue(pm.upstreamErrors, "rpc"))
}

func TestProxyMetrics_ResponseTimeRecordedOnSuccess(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	upstreamURL, _ := url.Parse(upstream.URL)

	pm := newTestMetrics()
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, uint64(1), histogramCount(pm.upstreamResponseTime, "rpc"))
}

func TestProxyMetrics_ResponseTimeRecordedOnError(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	upstreamURL, _ := url.Parse(upstream.URL)
	upstream.Close()

	pm := newTestMetrics()
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	// Response time is recorded even on connection errors (measures the failed attempt).
	require.Equal(t, uint64(1), histogramCount(pm.upstreamResponseTime, "rpc"))
}

func TestProxyMetrics_NilMetricsDoesNotPanic(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	upstreamURL, _ := url.Parse(upstream.URL)

	proxy := newReverseProxy(upstreamURL, discardLogger(), nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
}

func TestProxyMetrics_SPLabelUsed(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer upstream.Close()
	upstreamURL, _ := url.Parse(upstream.URL)

	pm := &proxyMetrics{
		upstreamErrors: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "test_sp_errors",
		}, []string{"upstream"}),
		upstreamResponseTime: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name: "test_sp_response_time",
		}, []string{"upstream"}),
		label: "sp",
	}
	proxy := newReverseProxy(upstreamURL, discardLogger(), pm)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	proxy.ServeHTTP(w, req)

	require.Equal(t, float64(1), counterValue(pm.upstreamErrors, "sp"))
	require.Equal(t, float64(0), counterValue(pm.upstreamErrors, "rpc"))
}
