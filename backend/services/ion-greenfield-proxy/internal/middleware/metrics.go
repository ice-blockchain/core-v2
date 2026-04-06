package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

type MetricsCollectors struct {
	RequestsTotal      *prometheus.CounterVec
	RequestDuration    *prometheus.HistogramVec
	RateLimitedByUser  prometheus.Counter
	RateLimitedByIP    prometheus.Counter
	RateLimitedGlobal  prometheus.Counter

	ProxyUpstreamErrors      *prometheus.CounterVec
	ProxyUpstreamResponseTime *prometheus.HistogramVec
	FeeGuaranteeRequests     *prometheus.CounterVec
	FeeGuaranteeSpendBNB     prometheus.Counter
	FeeGuaranteeDuration     prometheus.Histogram
}

func NewMetricsCollectors(reg *prometheus.Registry) *MetricsCollectors {
	m := &MetricsCollectors{
		RequestsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests.",
		}, []string{"method", "path", "status_code"}),
		RequestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: []float64{0.005, 0.025, 0.1, 0.5, 1, 5, 10},
		}, []string{"method", "path", "status_code"}),
	}
	m.RateLimitedByUser = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "req_limited_by_user",
		Help: "Requests rejected by per-user-key rate limit.",
	})
	m.RateLimitedByIP = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "req_limited_by_ip",
		Help: "Requests rejected by per-IP rate limit.",
	})
	m.RateLimitedGlobal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "req_limited_global",
		Help: "Requests rejected by global rate limit.",
	})
	m.ProxyUpstreamErrors = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "proxy_upstream_errors_total",
		Help: "Total upstream proxy errors (connection failures and 5xx responses).",
	}, []string{"upstream"})
	m.ProxyUpstreamResponseTime = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "proxy_upstream_response_time_seconds",
		Help:    "Upstream response time in seconds.",
		Buckets: []float64{0.005, 0.025, 0.1, 0.5, 1, 5, 10, 30},
	}, []string{"upstream"})
	m.FeeGuaranteeRequests = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "fee_guarantee_requests_total",
		Help: "Total fee guarantee outcomes per request.",
	}, []string{"result"})
	m.FeeGuaranteeSpendBNB = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "fee_guarantee_spend_bnb_total",
		Help: "Approximate total BNB granted via fee allowances.",
	})
	m.FeeGuaranteeDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "fee_guarantee_duration_seconds",
		Help:    "Wall time of MsgGrantAllowance submission.",
		Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30},
	})
	reg.MustRegister(
		m.RequestsTotal, m.RequestDuration,
		m.RateLimitedByUser, m.RateLimitedByIP, m.RateLimitedGlobal,
		m.ProxyUpstreamErrors, m.ProxyUpstreamResponseTime,
		m.FeeGuaranteeRequests, m.FeeGuaranteeSpendBNB, m.FeeGuaranteeDuration,
	)
	return m
}

func Metrics(mc *MetricsCollectors) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := strconv.Itoa(c.Writer.Status())
		path := c.FullPath()
		if path == "" {
			path = "unmatched"
		}
		method := c.Request.Method

		mc.RequestsTotal.WithLabelValues(method, path, status).Inc()
		mc.RequestDuration.WithLabelValues(method, path, status).Observe(time.Since(start).Seconds())
	}
}
