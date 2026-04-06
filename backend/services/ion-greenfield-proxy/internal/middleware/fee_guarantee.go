package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	gf "ion-greenfield-proxy/internal/greenfield"
)

func FeeGuarantee(logger *slog.Logger, provisioner gf.BucketProvisioner, proxyAddr, chainID string) gin.HandlerFunc {
	logger = logger.With("middleware", "fee_guarantee")
	return func(c *gin.Context) {
		interceptFeeAllowance(logger, provisioner, proxyAddr, chainID, c)
		c.Next()
	}
}
