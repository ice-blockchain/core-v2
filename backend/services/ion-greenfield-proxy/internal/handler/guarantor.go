package handler

import (
	"net/http"

	"ion-greenfield-proxy/internal/apperror"

	"github.com/gin-gonic/gin"
)

// GuarantorResponse is the response body for GET /guarantor.
type GuarantorResponse struct {
	Address string `json:"address" example:"0x1234567890abcdef1234567890abcdef12345678"`
	Amount  string `json:"amount" example:"0.001"`
}

// Guarantor returns the proxy's Greenfield account address and fee grant amount.
//
//	@Summary		Get fee guarantor info
//	@Description	Returns the proxy's on-chain Greenfield address and the BNB spend limit configured for each fee grant.
//	@Description	Clients call this endpoint before constructing transactions to discover which address to set as `fee_granter`.
//	@Description	The fee guarantee middleware only activates when a transaction's `fee_granter` matches the returned address.
//	@Description	The `amount` field reflects the per-grant spend cap.
//	@Tags			Guarantor
//	@Produce		json
//	@Success		200	{object}	GuarantorResponse
//	@Failure		403	{object}	apperror.AppError	"PROVISIONER_UNAVAILABLE -- bucket provisioning not configured"
//	@Router			/guarantor [get]
func Guarantor(proxyAddr string, feeGrantAmount string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if proxyAddr == "" {
			apperror.WriteError(ctx, apperror.New(http.StatusForbidden, "PROVISIONER_UNAVAILABLE", "bucket provisioning not configured"))
			return
		}
		ctx.JSON(http.StatusOK, GuarantorResponse{
			Address: proxyAddr,
			Amount:  feeGrantAmount,
		})
	}
}
