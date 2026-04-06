package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	gf "ion-greenfield-proxy/internal/greenfield"
)

func FeeGuarantee(logger *slog.Logger, provisioner gf.BucketProvisioner, proxyAddr, chainID string, mc *MetricsCollectors, feeGrantBNB float64) gin.HandlerFunc {
	logger = logger.With("middleware", "fee_guarantee")
	return func(c *gin.Context) {
		start := time.Now()
		result := interceptFeeAllowance(logger, provisioner, proxyAddr, chainID, c)

		if mc != nil {
			mc.FeeGuaranteeRequests.WithLabelValues(result).Inc()
			if result != FeeGuaranteeSkipped {
				mc.FeeGuaranteeDuration.Observe(time.Since(start).Seconds())
			}
			if result == FeeGuaranteeGranted {
				mc.FeeGuaranteeSpendBNB.Add(feeGrantBNB)
			}
		}

		c.Next()
	}
}
