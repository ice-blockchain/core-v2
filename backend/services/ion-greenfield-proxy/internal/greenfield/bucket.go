package greenfield

import (
	"cmp"
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"sync"
	"time"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	"github.com/bnb-chain/greenfield-go-sdk/pkg/utils"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	permTypes "github.com/bnb-chain/greenfield/x/permission/types"
	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/puzpuzpuz/xsync/v4"
)

const (
	// BucketChargedQuota is the read quota for new buckets (30 GB).
	BucketChargedQuota = 30 * 1024 * 1024 * 1024

	// FeeGrantExpiration is how long each fee grant lasts.
	FeeGrantExpiration = 5 * time.Minute
)

// bucketActions are granted on the bucket resource itself.
var bucketActions = []permTypes.ActionType{
	permTypes.ACTION_DELETE_BUCKET,
	permTypes.ACTION_LIST_OBJECT,
	permTypes.ACTION_CREATE_OBJECT,
}

// objectActions are granted on all objects within the bucket (grn:o::bucket/*).
var objectActions = []permTypes.ActionType{
	permTypes.ACTION_DELETE_OBJECT,
	permTypes.ACTION_COPY_OBJECT,
	permTypes.ACTION_GET_OBJECT,
	permTypes.ACTION_EXECUTE_OBJECT,
	permTypes.ACTION_UPDATE_OBJECT_INFO,
	permTypes.ACTION_UPDATE_OBJECT_CONTENT,
}

const spCacheTTL = 1 * time.Hour

// BucketProvisioner creates user buckets and grants object-level
// permissions on demand.
type BucketProvisioner struct {
	client gnfdclient.IClient
	logger *slog.Logger
	known  *xsync.Map[string, struct{}]

	spMu      sync.Mutex
	spCache   []spTypes.StorageProvider
	spExpires time.Time
}

func NewBucketProvisioner(client gnfdclient.IClient, logger *slog.Logger) *BucketProvisioner {
	return &BucketProvisioner{
		client: client,
		logger: cmp.Or(logger, slog.Default()).With("component", "bucket_provisioner"),
		known:  xsync.NewMap[string, struct{}](),
	}
}

// ProxyAddress returns the proxy account's bech32 address.
func (bp *BucketProvisioner) ProxyAddress() string {
	account, err := bp.client.GetDefaultAccount()
	if err != nil {
		return ""
	}
	return account.GetAddress().String()
}

func (bp *BucketProvisioner) storageProviders(ctx context.Context) ([]spTypes.StorageProvider, error) {
	bp.spMu.Lock()
	defer bp.spMu.Unlock()

	if time.Now().Before(bp.spExpires) && len(bp.spCache) > 0 {
		return bp.spCache, nil
	}

	sps, err := bp.client.ListStorageProviders(ctx, true)
	if err != nil {
		return nil, fmt.Errorf("list storage providers: %w", err)
	}
	if len(sps) == 0 {
		return nil, fmt.Errorf("no active storage providers")
	}

	slices.SortStableFunc(sps, func(a, b spTypes.StorageProvider) int {
		aPreferred := strings.Contains(a.Endpoint, ".bnbchain.")
		bPreferred := strings.Contains(b.Endpoint, ".bnbchain.")
		switch {
		case aPreferred && !bPreferred:
			return -1
		case !aPreferred && bPreferred:
			return 1
		default:
			return 0
		}
	})

	bp.spCache = sps
	bp.spExpires = time.Now().Add(spCacheTTL)
	bp.logger.Info("storage providers cached", "count", len(sps))
	return sps, nil
}

// EnsureBucket creates the bucket if it doesn't exist and grants the
// user object-level CRUD permissions. The bucket name must be the
// user's lowercase hex address (without 0x prefix).
// Returns the CreateBucket tx hash when a new bucket is created, or
// empty string if the bucket already existed.
func (bp *BucketProvisioner) EnsureBucket(ctx context.Context, bucketName string, creatorAddr string) (string, error) {
	if _, ok := bp.known.Load(bucketName); ok {
		return "", nil
	}

	exists, err := bp.bucketExists(ctx, bucketName)
	if err != nil {
		return "", fmt.Errorf("check bucket existence: %w", err)
	}

	var txHash string
	if !exists {
		txHash, err = bp.createBucket(ctx, bucketName)
		if err != nil {
			if !isBucketAlreadyExists(err) {
				return "", fmt.Errorf("create bucket: %w", err)
			}
			bp.logger.Info("bucket already exists (concurrent creation)", "bucket", bucketName)
		} else {
			if err := bp.grantObjectPermissions(ctx, bucketName, creatorAddr); err != nil {
				return "", fmt.Errorf("grant permissions: %w", err)
			}
			if err := bp.enableDelegatedAgent(ctx, bucketName); err != nil {
				return "", fmt.Errorf("enable delegated agent: %w", err)
			}
		}
	}

	bp.known.Store(bucketName, struct{}{})
	return txHash, nil
}

func isBucketAlreadyExists(err error) bool {
	return strings.Contains(err.Error(), "already exists") ||
		strings.Contains(err.Error(), "BucketAlreadyExists")
}

func (bp *BucketProvisioner) bucketExists(ctx context.Context, bucketName string) (bool, error) {
	_, err := bp.client.HeadBucket(ctx, bucketName)
	if err == nil {
		return true, nil
	}
	if strings.Contains(err.Error(), "No such bucket") {
		return false, nil
	}
	return false, err
}

func (bp *BucketProvisioner) createBucket(ctx context.Context, bucketName string) (string, error) {
	sps, err := bp.storageProviders(ctx)
	if err != nil {
		return "", err
	}

	proxyAccount, err := bp.client.GetDefaultAccount()
	if err != nil {
		return "", fmt.Errorf("get proxy account: %w", err)
	}
	proxyAddr := proxyAccount.GetAddress().String()

	opts := gnfdtypes.CreateBucketOptions{
		Visibility:     storageTypes.VISIBILITY_TYPE_PUBLIC_READ,
		PaymentAddress: proxyAddr,
		ChargedQuota:   BucketChargedQuota,
	}

	// Try each SP until one succeeds — some may be unreachable.
	var lastErr error
	for _, sp := range sps {
		bp.logger.Info("creating bucket",
			"bucket", bucketName,
			"primary_sp", sp.OperatorAddress,
		)

		txHash, err := bp.client.CreateBucket(ctx, bucketName, sp.OperatorAddress, opts)
		if err != nil {
			bp.logger.Warn("CreateBucket failed with SP, trying next",
				"sp", sp.OperatorAddress,
				"error", err,
			)
			lastErr = err
			continue
		}

		if _, err = bp.client.WaitForTx(ctx, txHash); err != nil {
			bp.logger.Warn("WaitForTx failed after CreateBucket, trying next SP",
				"sp", sp.OperatorAddress,
				"error", err,
			)
			lastErr = err
			continue
		}

		bp.logger.Info("bucket created", "bucket", bucketName, "tx", txHash)
		return txHash, nil
	}

	return "", fmt.Errorf("all SPs failed: %w", lastErr)
}

func (bp *BucketProvisioner) grantObjectPermissions(ctx context.Context, bucketName string, creatorAddr string) error {
	addr, err := sdk.AccAddressFromHexUnsafe(strings.TrimPrefix(creatorAddr, "0x"))
	if err != nil {
		return fmt.Errorf("parse creator address %q: %w", creatorAddr, err)
	}

	principal, err := utils.NewPrincipalWithAccount(addr)
	if err != nil {
		return fmt.Errorf("create principal: %w", err)
	}

	bucketStmt := utils.NewStatement(
		bucketActions,
		permTypes.EFFECT_ALLOW,
		[]string{},
		gnfdtypes.NewStatementOptions{},
	)

	objectResource := "grn:o::" + bucketName + "/*"
	objectStmt := utils.NewStatement(
		objectActions,
		permTypes.EFFECT_ALLOW,
		[]string{objectResource},
		gnfdtypes.NewStatementOptions{},
	)

	bp.logger.Info("granting permissions",
		"bucket", bucketName,
		"grantee", creatorAddr,
		"bucket_actions", bucketActions,
		"object_actions", objectActions,
	)

	txHash, err := bp.client.PutBucketPolicy(ctx, bucketName, principal,
		[]*permTypes.Statement{&bucketStmt, &objectStmt},
		gnfdtypes.PutPolicyOption{},
	)
	if err != nil {
		return err
	}

	_, err = bp.client.WaitForTx(ctx, txHash)
	if err != nil {
		return fmt.Errorf("wait for PutBucketPolicy tx: %w", err)
	}

	bp.logger.Info("permissions granted", "bucket", bucketName, "tx", txHash)
	return nil
}

func (bp *BucketProvisioner) enableDelegatedAgent(ctx context.Context, bucketName string) error {
	info, err := bp.client.HeadBucket(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("head bucket: %w", err)
	}

	if !info.SpAsDelegatedAgentDisabled {
		bp.logger.Info("delegated agent already enabled", "bucket", bucketName)
		return nil
	}

	bp.logger.Info("enabling SP delegated agent", "bucket", bucketName)

	txHash, err := bp.client.ToggleSPAsDelegatedAgent(ctx, bucketName, gnfdtypes.UpdateBucketOptions{})
	if err != nil {
		return err
	}

	_, err = bp.client.WaitForTx(ctx, txHash)
	if err != nil {
		return fmt.Errorf("wait for ToggleSPAsDelegatedAgent tx: %w", err)
	}

	bp.logger.Info("delegated agent enabled", "bucket", bucketName, "tx", txHash)
	return nil
}
