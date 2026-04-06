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
const (
	FeeGuaranteeSkipped = "skipped"
	FeeGuaranteeGranted = "granted"
	FeeGuaranteeCached  = "cached"
	FeeGuaranteeFailed  = "failed"
)

func interceptFeeAllowance(logger *slog.Logger, provisioner gf.BucketProvisioner, proxyAddr, chainID string, c *gin.Context) string {
	parsed := rpcbody.FromContext(c)
	if parsed == nil || provisioner == nil {
		return FeeGuaranteeSkipped
	}
	if !parsed.IsSyncBroadcast() {
		return FeeGuaranteeSkipped
	}

	tx, err := decodeTx(parsed)
	if err != nil || tx == nil || len(tx.Messages) == 0 {
		return FeeGuaranteeSkipped
	}

	if proxyAddr == "" || !strings.EqualFold(tx.FeeGranter, proxyAddr) {
		return FeeGuaranteeSkipped
	}

	// First pass: validate ALL messages are recognized and target the
	// signer's own bucket. Reject if any message fails.
	var validatedBucket string
	for _, a := range tx.Messages {
		addr, bucket, ok := extractUserBucketMsg(a)
		if !ok {
			return FeeGuaranteeSkipped
		}
		creatorHex := strings.ToLower(strings.TrimPrefix(addr, "0x"))
		if bucket != creatorHex {
			return FeeGuaranteeSkipped
		}
		if validatedBucket == "" {
			validatedBucket = bucket
		} else if validatedBucket != bucket {
			return FeeGuaranteeSkipped
		}
	}

	// All messages validated. Use first message's creator for verification.
	firstAddr, _, _ := extractUserBucketMsg(tx.Messages[0])
	creatorHex := strings.ToLower(strings.TrimPrefix(firstAddr, "0x"))
	creatorAddr := "0x" + creatorHex

	signer, err := verifyTxSigner(c.Request.Context(), tx, chainID, provisioner, true)
	if err != nil {
		logger.Warn("fee allowance signature verification failed",
			"creator", creatorAddr,
			"error", err,
		)
		return FeeGuaranteeSkipped
	}
	if !strings.EqualFold(signer, creatorAddr) {
		logger.Warn("fee allowance signer mismatch",
			"creator", creatorAddr,
			"signer", signer,
		)
		return FeeGuaranteeSkipped
	}

	c.Set(ContextKeyTxSigner, signer)
	logger.Info("granting fee allowance",
		"creator", creatorAddr,
		"bucket", validatedBucket,
		"message_count", len(tx.Messages),
		"verified_signer", signer,
	)

	granted, err := provisioner.GrantFeeAllowance(c.Request.Context(), creatorAddr)
	if err != nil {
		logger.Error("failed to grant fee allowance",
			"grantee", creatorAddr,
			"error", err,
		)
		return FeeGuaranteeFailed
	}
	if granted {
		return FeeGuaranteeGranted
	}
	return FeeGuaranteeCached
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
