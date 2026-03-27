package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

type MetricsCollectors struct {
	RequestsTotal   *prometheus.CounterVec
	RequestDuration *prometheus.HistogramVec
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
	reg.MustRegister(m.RequestsTotal, m.RequestDuration)
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
