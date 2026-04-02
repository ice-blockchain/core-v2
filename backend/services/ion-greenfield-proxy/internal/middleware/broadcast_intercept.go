package middleware

import (
	"log/slog"
	"strings"

	"github.com/gin-gonic/gin"

	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"

	gf "ion-greenfield-proxy/internal/greenfield"
	"ion-greenfield-proxy/internal/rpcbody"
)

// interceptFeeAllowance inspects Simulate and broadcast_tx requests for
// messages that target the user's own bucket (bucket name == creator hex
// address) and grants a short-lived fee allowance so the chain accepts the
// tx with the proxy as fee payer. The request is then forwarded as-is.
//
// Recognised messages: object CUD (create, update, delete) and DeleteBucket.
// CreateBucket is handled separately by interceptCreateBucket.
func interceptFeeAllowance(logger *slog.Logger, provisioner *gf.BucketProvisioner, proxyAddr string, c *gin.Context) {
	parsed := rpcbody.FromContext(c)
	if parsed == nil || provisioner == nil {
		return
	}
	if !parsed.IsBroadcast() && !parsed.IsABCIQuery("/cosmos.tx.v1beta1.Service/Simulate") {
		return
	}

	tx, err := decodeTx(parsed)
	if err != nil || tx == nil || len(tx.Messages) == 0 {
		return
	}

	if !strings.EqualFold(tx.FeeGranter, proxyAddr) {
		return
	}

	for _, a := range tx.Messages {
		addr, bucket, ok := extractUserBucketMsg(a)
		if !ok {
			continue
		}

		creatorHex := strings.ToLower(strings.TrimPrefix(addr, "0x"))
		if bucket != creatorHex {
			continue
		}

		creatorAddr := "0x" + creatorHex

		logger.Info("granting fee allowance",
			"type", a.TypeUrl,
			"creator", creatorAddr,
			"bucket", bucket,
		)

		if err := provisioner.GrantFeeAllowance(c.Request.Context(), creatorAddr); err != nil {
			logger.Error("failed to grant fee allowance",
				"grantee", creatorAddr,
				"error", err,
			)
		}
		return
	}
}

// extractUserBucketMsg returns (address, bucketName, true) for messages
// that need a fee allowance. CreateBucket is excluded — it is handled
// by interceptCreateBucket.
func extractUserBucketMsg(a *codectypes.Any) (addr string, bucket string, ok bool) {
	switch a.TypeUrl {
	case "/greenfield.storage.MsgDeleteBucket":
		var m storageTypes.MsgDeleteBucket
		if m.Unmarshal(a.Value) != nil {
			return "", "", false
		}
		return m.Operator, m.BucketName, true

	case "/greenfield.storage.MsgDelegateCreateObject":
		var m storageTypes.MsgDelegateCreateObject
		if m.Unmarshal(a.Value) != nil {
			return "", "", false
		}
		return m.Creator, m.BucketName, true

	case "/greenfield.storage.MsgCreateObject":
		var m storageTypes.MsgCreateObject
		if m.Unmarshal(a.Value) != nil {
			return "", "", false
		}
		return m.Creator, m.BucketName, true

	case "/greenfield.storage.MsgUpdateObjectContent":
		var m storageTypes.MsgUpdateObjectContent
		if m.Unmarshal(a.Value) != nil {
			return "", "", false
		}
		return m.Operator, m.BucketName, true

	case "/greenfield.storage.MsgDeleteObject":
		var m storageTypes.MsgDeleteObject
		if m.Unmarshal(a.Value) != nil {
			return "", "", false
		}
		return m.Operator, m.BucketName, true
	}
	return "", "", false
}
