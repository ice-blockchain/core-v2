package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"ion-greenfield-proxy/internal/rpcbody"
)

const (
	ContextKeyADNLAddress = "adnl_address"
	ContextKeyADNLRLDPID  = "adnl_rldp_id"
	ContextKeyTxSigner    = "tx_signer"
)

func Logger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := uuid.NewString()
		c.Header("X-Request-Id", requestID)
		start := time.Now()

		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		fields := []any{
			"request_id", requestID,
			"remote_addr", c.ClientIP(),
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"latency_ms", time.Since(start).Milliseconds(),
			"request_size", c.Request.ContentLength,
			"response_size", c.Writer.Size(),
		}

		if addr, ok := c.Get(ContextKeyADNLAddress); ok {
			fields = append(fields, "adnl_address", addr)
		}
		if rldp, ok := c.Get(ContextKeyADNLRLDPID); ok {
			fields = append(fields, "adnl_rldp_id", rldp)
		}

		if signer, ok := c.Get(ContextKeyTxSigner); ok {
			fields = append(fields, "tx_signer", signer)
		}

		if parsed := rpcbody.FromContext(c); parsed != nil {
			fields = append(fields, "rpc_method", parsed.Method)
			if parsed.ABCIPath != "" {
				fields = append(fields, "rpc_abci_path", parsed.ABCIPath)
			}
		}

		if errs := c.Errors; len(errs) > 0 {
			fields = append(fields, "errors", errs.String())
		}

		logger.Info("request", fields...)
	}
}
