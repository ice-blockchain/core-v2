package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"ion-greenfield-proxy/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/require"
)

func counterVecValue(cv *prometheus.CounterVec, labels ...string) float64 {
	m := &dto.Metric{}
	c, err := cv.GetMetricWithLabelValues(labels...)
	if err != nil {
		return 0
	}
	_ = c.(prometheus.Metric).Write(m)
	return m.GetCounter().GetValue()
}

func plainCounterValue(c prometheus.Counter) float64 {
	m := &dto.Metric{}
	_ = c.(prometheus.Metric).Write(m)
	return m.GetCounter().GetValue()
}

func histogramSampleCount(h prometheus.Histogram) uint64 {
	m := &dto.Metric{}
	_ = h.(prometheus.Metric).Write(m)
	return m.GetHistogram().GetSampleCount()
}

func TestMetricsRegistration_NoCollision(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	require.NotNil(t, mc.RequestsTotal)
	require.NotNil(t, mc.RequestDuration)
	require.NotNil(t, mc.ProxyUpstreamErrors)
	require.NotNil(t, mc.ProxyUpstreamResponseTime)
	require.NotNil(t, mc.FeeGuaranteeRequests)
	require.NotNil(t, mc.FeeGuaranteeSpendBNB)
	require.NotNil(t, mc.FeeGuaranteeDuration)

	// Touch each vec metric so Gather can see them.
	mc.RequestsTotal.WithLabelValues("GET", "/", "200").Inc()
	mc.RequestDuration.WithLabelValues("GET", "/", "200").Observe(0)
	mc.ProxyUpstreamErrors.WithLabelValues("rpc").Inc()
	mc.ProxyUpstreamResponseTime.WithLabelValues("rpc").Observe(0)
	mc.FeeGuaranteeRequests.WithLabelValues("skipped").Inc()
	mc.FeeGuaranteeDuration.Observe(0)

	families, err := reg.Gather()
	require.NoError(t, err)

	names := make(map[string]bool, len(families))
	for _, f := range families {
		names[f.GetName()] = true
	}

	require.True(t, names["http_requests_total"])
	require.True(t, names["http_request_duration_seconds"])
	require.True(t, names["proxy_upstream_errors_total"])
	require.True(t, names["proxy_upstream_response_time_seconds"])
	require.True(t, names["fee_guarantee_requests_total"])
	require.True(t, names["fee_guarantee_spend_bnb_total"])
	require.True(t, names["fee_guarantee_duration_seconds"])
}

func TestFeeGuaranteeRequests_SkippedOnNonBroadcast(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	r := gin.New()
	r.Use(middleware.FeeGuarantee(discardLogger(), nil, "", "", mc, 0.001))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, float64(1), counterVecValue(mc.FeeGuaranteeRequests, "skipped"))
	require.Equal(t, float64(0), counterVecValue(mc.FeeGuaranteeRequests, "granted"))
	require.Equal(t, float64(0), counterVecValue(mc.FeeGuaranteeRequests, "failed"))
}

func TestFeeGuaranteeDuration_NotObservedOnSkip(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	r := gin.New()
	r.Use(middleware.FeeGuarantee(discardLogger(), nil, "", "", mc, 0.001))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, uint64(0), histogramSampleCount(mc.FeeGuaranteeDuration))
}

func TestFeeGuaranteeSpend_NotIncrementedOnSkip(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	r := gin.New()
	r.Use(middleware.FeeGuarantee(discardLogger(), nil, "", "", mc, 0.001))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, float64(0), plainCounterValue(mc.FeeGuaranteeSpendBNB))
}

func TestFeeGuaranteeRequests_MultipleSkipsAccumulate(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	r := gin.New()
	r.Use(middleware.FeeGuarantee(discardLogger(), nil, "", "", mc, 0.001))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		r.ServeHTTP(w, req)
	}

	require.Equal(t, float64(5), counterVecValue(mc.FeeGuaranteeRequests, "skipped"))
}

func TestMetricsMiddleware_IncrementsRequestCounter(t *testing.T) {
	t.Parallel()

	reg := prometheus.NewRegistry()
	mc := middleware.NewMetricsCollectors(reg)

	r := gin.New()
	r.Use(middleware.Metrics(mc))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, float64(1), counterVecValue(mc.RequestsTotal, "GET", "/test", "200"))
}

func TestNilMetricsCollectors_DoesNotPanic(t *testing.T) {
	t.Parallel()

	r := gin.New()
	r.Use(middleware.FeeGuarantee(discardLogger(), nil, "", "", nil, 0.001))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
}
