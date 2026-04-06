package greenfield

import (
	"context"
	"fmt"
	"strings"
	"time"

	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/feegrant"
)

// allowedFeeGrantMsgs is the on-chain whitelist of message types that a
// fee-granted user can broadcast at the proxy's expense. Must match the
// types recognised by extractUserBucketMsg in broadcast_intercept.go.
var allowedFeeGrantMsgs = []string{
	"/greenfield.storage.MsgCreateObject",
	"/greenfield.storage.MsgDelegateCreateObject",
	"/greenfield.storage.MsgUpdateObjectContent",
	"/greenfield.storage.MsgDeleteObject",
	"/greenfield.storage.MsgDeleteBucket",
}

// GrantFeeAllowance grants a short-lived, message-scoped fee allowance
// to the given address so it can broadcast storage transactions with
// the proxy as fee payer. Only the message types in allowedFeeGrantMsgs
// are permitted; the chain rejects anything else.
func (bp *bucketProvisioner) GrantFeeAllowance(ctx context.Context, granteeAddr string) error {
	if lastGrant, ok := bp.recentGrants.Load(granteeAddr); ok {
		if time.Since(lastGrant) < feeGrantDedupTTL {
			bp.logger.Debug("fee grant dedup hit, skipping", "grantee", granteeAddr)
			return nil
		}
	}

	// Serialise with other on-chain transactions from the proxy wallet.
	if err := bp.txLock.Lock(ctx, "GrantFeeAllowance:"+granteeAddr); err != nil {
		return fmt.Errorf("acquire tx lock: %w", err)
	}
	defer bp.txLock.Unlock()

	return bp.grantFeeAllowanceLocked(ctx, granteeAddr)
}

// grantFeeAllowanceLocked performs the on-chain fee grant.
// Caller must hold txLock.
func (bp *bucketProvisioner) grantFeeAllowanceLocked(ctx context.Context, granteeAddr string) error {
	addr := strings.TrimPrefix(granteeAddr, "0x")

	expiration := time.Now().Add(FeeGrantExpiration)
	amount := bp.feeGrantAmount

	basic := feegrant.BasicAllowance{
		SpendLimit: sdk.NewCoins(sdk.NewCoin(gnfdsdktypes.Denom, amount)),
		Expiration: &expiration,
	}
	allowance, err := feegrant.NewAllowedMsgAllowance(&basic, allowedFeeGrantMsgs)
	if err != nil {
		return fmt.Errorf("create allowed msg allowance: %w", err)
	}

	bp.logger.Info("granting fee allowance",
		"grantee", granteeAddr,
		"amount_wei", amount.String(),
		"expiration", expiration.Format(time.RFC3339),
		"allowed_msgs", allowedFeeGrantMsgs,
	)

	txHash, err := bp.client.GrantAllowance(ctx, addr, allowance, gnfdsdktypes.TxOption{})
	if err != nil {
		if strings.Contains(err.Error(), "fee allowance already exists") {
			bp.logger.Debug("fee allowance already active", "grantee", granteeAddr)
			bp.recentGrants.Store(granteeAddr, time.Now())
			return nil
		}
		return fmt.Errorf("GrantAllowance: %w", err)
	}

	if _, err = bp.client.WaitForTx(ctx, txHash); err != nil {
		return fmt.Errorf("wait for GrantAllowance tx: %w", err)
	}

	bp.recentGrants.Store(granteeAddr, time.Now())
	bp.logger.Info("fee allowance granted", "grantee", granteeAddr, "tx", txHash)
	return nil
}

// StartGrantCleanup starts a background goroutine that evicts stale
// fee grant dedup entries. Call the returned function to stop it.
func (bp *bucketProvisioner) StartGrantCleanup(interval time.Duration) func() {
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				cutoff := time.Now().Add(-feeGrantDedupTTL)
				bp.recentGrants.Range(func(key string, ts time.Time) bool {
					if ts.Before(cutoff) {
						bp.recentGrants.Delete(key)
					}
					return true
				})
			case <-done:
				return
			}
		}
	}()
	return func() { close(done) }
}
