package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/rpcbody"
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
			// Only count spend for real on-chain grants, not dedup hits.
			if result == FeeGuaranteeGranted {
				mc.FeeGuaranteeSpendBNB.Add(feeGrantBNB)
			}
		}

		if result == FeeGuaranteeFailed {
			parsed := rpcbody.FromContext(c)
			if parsed != nil {
				abortJSONRPCError(c, parsed.Raw, "fee guarantee unavailable, try again later")
			} else {
				c.AbortWithStatus(http.StatusServiceUnavailable)
			}
			return
		}

		c.Next()
	}
}
