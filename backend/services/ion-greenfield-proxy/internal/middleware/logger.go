package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	ContextKeyUserID        = "user_id"
	ContextKeyUserMasterKey = "user_master_key"
	ContextKeyADNLAddress   = "adnl_address"
	ContextKeyADNLRLDPID    = "adnl_rldp_id"
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

		if uid, ok := c.Get(ContextKeyUserID); ok {
			fields = append(fields, "user_id", uid)
		}
		if mk, ok := c.Get(ContextKeyUserMasterKey); ok {
			if s, ok := mk.(string); ok {
				fields = append(fields, "user_master_key", maskKey(s))
			}
		}
		if addr, ok := c.Get(ContextKeyADNLAddress); ok {
			fields = append(fields, "adnl_address", addr)
		}
		if rldp, ok := c.Get(ContextKeyADNLRLDPID); ok {
			fields = append(fields, "adnl_rldp_id", rldp)
		}

		logger.Info("request", fields...)
	}
}

func maskKey(key string) string {
	if len(key) <= 10 {
		return "***"
	}
	return key[:6] + "..." + key[len(key)-4:]
}
