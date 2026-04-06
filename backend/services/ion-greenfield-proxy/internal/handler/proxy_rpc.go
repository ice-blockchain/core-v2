package handler

import (
	"log/slog"
	"net/url"

	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/middleware"
)

func ProxyRPC(rpcURL *url.URL, logger *slog.Logger, adnlAddress string, mc *middleware.MetricsCollectors) gin.HandlerFunc {
	var pm *proxyMetrics
	if mc != nil {
		pm = &proxyMetrics{
			upstreamErrors:       mc.ProxyUpstreamErrors,
			upstreamResponseTime: mc.ProxyUpstreamResponseTime,
			label:                "rpc",
		}
	}
	proxy := newReverseProxy(rpcURL, logger, pm)
	return func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
