package greenfield

import (
	"context"
	"fmt"
	"strings"
	"time"

	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
)

// GrantFeeAllowance grants a short-lived fee allowance to the given
// address so it can broadcast transactions with the proxy as fee payer.
func (bp *BucketProvisioner) GrantFeeAllowance(ctx context.Context, granteeAddr string) error {
	addr := strings.TrimPrefix(granteeAddr, "0x")

	expiration := time.Now().Add(FeeGrantExpiration)
	amount := bp.feeGrantAmount

	bp.logger.Info("granting fee allowance",
		"grantee", granteeAddr,
		"amount_wei", amount.String(),
		"expiration", expiration.Format(time.RFC3339),
	)

	txHash, err := bp.client.GrantBasicAllowance(ctx, addr, amount, &expiration, gnfdsdktypes.TxOption{})
	if err != nil {
		if strings.Contains(err.Error(), "fee allowance already exists") {
			bp.logger.Debug("fee allowance already active", "grantee", granteeAddr)
			return nil
		}
		return fmt.Errorf("GrantBasicAllowance: %w", err)
	}

	if _, err = bp.client.WaitForTx(ctx, txHash); err != nil {
		return fmt.Errorf("wait for GrantBasicAllowance tx: %w", err)
	}

	bp.logger.Info("fee allowance granted", "grantee", granteeAddr, "tx", txHash)
	return nil
}
