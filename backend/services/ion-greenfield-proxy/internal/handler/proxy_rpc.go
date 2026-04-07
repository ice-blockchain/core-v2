package handler

import (
	"log/slog"
	"net/url"

	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/middleware"
)

// ProxyRPC forwards all unmatched requests to the upstream Greenfield RPC endpoint.
//
//	@Summary		Proxy to Greenfield RPC
//	@Description	Catch-all reverse proxy that forwards requests to the configured Greenfield RPC endpoint. JSON-RPC requests for broadcast_tx_sync/commit may be intercepted by middleware for fee guarantee and bucket provisioning.
//	@Tags			RPC Proxy
//	@Accept			json
//	@Produce		json
//	@Success		200	"Proxied response from Greenfield RPC"
//	@Router			/ [get]
//	@Router			/ [post]
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
