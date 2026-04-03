package metrics

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// RegisterRoutes adds the /metrics endpoint to the given router.
func RegisterRoutes(router gin.IRouter, registry *prometheus.Registry) {
	handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
	router.GET("/metrics", gin.WrapH(handler))
}
