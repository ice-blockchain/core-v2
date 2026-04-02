package handler

import (
	"log/slog"
	"net/url"

	"github.com/gin-gonic/gin"
)

func ProxyRPC(rpcURL *url.URL, logger *slog.Logger, adnlAddress string) gin.HandlerFunc {
	proxy := newReverseProxy(rpcURL, logger)
	return func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
