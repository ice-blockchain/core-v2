package middleware

import (
	"github.com/gin-gonic/gin"

	"ion-greenfield-proxy/internal/rpcbody"
)

// RPCParser parses POST / JSON-RPC requests and stores the result
// in the Gin context for downstream middleware and handlers.
func RPCParser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if parsed := rpcbody.TryParse(c); parsed != nil {
			parsed.Store(c)
		}
		c.Next()
	}
}
