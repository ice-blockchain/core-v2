package greenfield

import (
	"cmp"
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	sdkmath "cosmossdk.io/math"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	"github.com/bnb-chain/greenfield-go-sdk/pkg/utils"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	permTypes "github.com/bnb-chain/greenfield/x/permission/types"
	spTypes "github.com/bnb-chain/greenfield/x/sp/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/puzpuzpuz/xsync/v4"

	"ion-greenfield-proxy/internal/config"
	"ion-greenfield-proxy/internal/ctxlock"
)

type (
	BucketProvisioner interface {
		ProxyAddress() string
		GetAccountNumber(ctx context.Context, hexAddr string) (uint64, error)
		IsKnownSPHost(ctx context.Context, host string) (bool, error)
		EnsureBucket(ctx context.Context, bucketName string, creatorAddr string) (string, error)
		GrantFeeAllowance(ctx context.Context, granteeAddr string) (bool, error)
		StartGrantCleanup(interval time.Duration) func()
	}
)

const (
	// BucketChargedQuota is the read quota for new buckets (30 GB).
	BucketChargedQuota = 30 * 1024 * 1024 * 1024

	// FeeGrantExpiration is how long each fee grant lasts.
	FeeGrantExpiration = 5 * time.Minute

	// feeGrantDedupTTL is the deduplication window for fee grant requests.
	// Within this window, repeated requests for the same address are skipped.
	feeGrantDedupTTL = 10 * time.Second
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
type bucketProvisioner struct {
	client         gnfdclient.IClient
	logger         *slog.Logger
	known          *xsync.Map[string, struct{}]
	feeGrantAmount sdkmath.Int

	// accountNumbers caches address → account number. Account numbers
	// are immutable once assigned, so entries never expire.
	accountNumbers *xsync.Map[string, uint64]

	// recentGrants deduplicates fee grant requests within feeGrantDedupTTL.
	recentGrants *xsync.Map[string, time.Time]

	// txLock serialises all on-chain transactions broadcast from the
	// proxy wallet. The Greenfield SDK client does not handle
	// concurrent broadcasts — each tx requires a monotonically
	// increasing sequence number that would race without this lock.
	txLock *ctxlock.Mutex

	spMu      sync.Mutex
	spCache   []spTypes.StorageProvider
	spExpires time.Time
}

func NewBucketProvisioner(client gnfdclient.IClient, logger *slog.Logger, cfg *config.Config) (BucketProvisioner, error) {
	amount, err := parseBNBToWei(cfg.GreenfieldFeeGrantAmount)
	if err != nil {
		return nil, fmt.Errorf("invalid GREENFIELD_FEE_GRANT_AMOUNT_BNB %q: %w", cfg.GreenfieldFeeGrantAmount, err)
	}

	l := cmp.Or(logger, slog.Default()).With("component", "bucket_provisioner")
	return &bucketProvisioner{
		client:         client,
		logger:         l,
		known:          xsync.NewMap[string, struct{}](),
		feeGrantAmount: amount,
		accountNumbers: xsync.NewMap[string, uint64](),
		recentGrants:   xsync.NewMap[string, time.Time](),
		txLock:         ctxlock.New(l, 3*time.Second),
	}, nil
}

// parseBNBToWei converts a BNB decimal string (e.g. "0.001") to wei.
// Rejects non-positive values and amounts exceeding 1 BNB.
func parseBNBToWei(bnb string) (sdkmath.Int, error) {
	dec, err := sdkmath.LegacyNewDecFromStr(bnb)
	if err != nil {
		return sdkmath.Int{}, fmt.Errorf("parse BNB amount: %w", err)
	}
	if !dec.IsPositive() {
		return sdkmath.Int{}, fmt.Errorf("fee grant amount must be positive, got %s", bnb)
	}
	maxBNB := sdkmath.LegacyNewDec(1)
	if dec.GT(maxBNB) {
		return sdkmath.Int{}, fmt.Errorf("fee grant amount %s exceeds maximum of 1 BNB", bnb)
	}
	weiPerBNB := sdkmath.LegacyNewDec(1e18)
	return dec.Mul(weiPerBNB).TruncateInt(), nil
}

// ProxyAddress returns the proxy account's bech32 address.
func (bp *bucketProvisioner) ProxyAddress() string {
	account, err := bp.client.GetDefaultAccount()
	if err != nil {
		return ""
	}
	return account.GetAddress().String()
}

// GetAccountNumber returns the on-chain account number for the given hex
// address. Results are cached permanently (account numbers are immutable).
func (bp *bucketProvisioner) GetAccountNumber(ctx context.Context, hexAddr string) (uint64, error) {
	addr := strings.ToLower(strings.TrimPrefix(hexAddr, "0x"))

	var fetchErr error
	num, _ := bp.accountNumbers.LoadOrCompute(addr, func() (uint64, bool) {
		account, err := bp.client.GetAccount(ctx, addr)
		if err != nil {
			fetchErr = fmt.Errorf("get account %s: %w", addr, err)
			return 0, true // cancel — don't cache failures
		}
		return account.GetAccountNumber(), false
	})
	return num, fetchErr
}

// IsKnownSPHost checks whether the given host matches any cached storage
// provider endpoint (exact match or bucket-prefixed subdomain).
// Returns false if the SP list is empty or stale and cannot be refreshed.
func (bp *bucketProvisioner) IsKnownSPHost(ctx context.Context, host string) (bool, error) {
	sps, err := bp.storageProviders(ctx)
	if err != nil {
		return false, err
	}

	for _, sp := range sps {
		spURL, err := url.Parse(sp.Endpoint)
		if err != nil || spURL.Host == "" {
			continue
		}
		spHost := spURL.Host
		if strings.EqualFold(host, spHost) || strings.HasSuffix(strings.ToLower(host), "."+strings.ToLower(spHost)) {
			return true, nil
		}
	}
	return false, nil
}

func (bp *bucketProvisioner) storageProviders(ctx context.Context) ([]spTypes.StorageProvider, error) {
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
func (bp *bucketProvisioner) EnsureBucket(ctx context.Context, bucketName string, creatorAddr string) (string, error) {
	if _, ok := bp.known.Load(bucketName); ok {
		return "", nil
	}

	// Serialise all on-chain transactions from the proxy wallet.
	if err := bp.txLock.Lock(ctx, "EnsureBucket:"+bucketName); err != nil {
		return "", fmt.Errorf("acquire tx lock: %w", err)
	}
	defer bp.txLock.Unlock()

	// Re-check after lock acquisition (another goroutine may have created it).
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
		}
	}

	if err := bp.grantObjectPermissions(ctx, bucketName, creatorAddr); err != nil {
		return "", fmt.Errorf("grant permissions: %w", err)
	}
	if err := bp.enableDelegatedAgent(ctx, bucketName); err != nil {
		return "", fmt.Errorf("enable delegated agent: %w", err)
	}

	// Grant an initial fee allowance so the user can immediately
	// simulate and broadcast operations on their new bucket.
	if _, err := bp.grantFeeAllowanceLocked(ctx, creatorAddr); err != nil {
		return "", fmt.Errorf("grant initial fee allowance: %w", err)
	}

	bp.known.Store(bucketName, struct{}{})
	return txHash, nil
}

func isBucketAlreadyExists(err error) bool {
	return strings.Contains(err.Error(), "already exists") ||
		strings.Contains(err.Error(), "BucketAlreadyExists")
}

func (bp *bucketProvisioner) bucketExists(ctx context.Context, bucketName string) (bool, error) {
	_, err := bp.client.HeadBucket(ctx, bucketName)
	if err == nil {
		return true, nil
	}
	if strings.Contains(err.Error(), "No such bucket") {
		return false, nil
	}
	return false, err
}

func (bp *bucketProvisioner) createBucket(ctx context.Context, bucketName string) (string, error) {
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

func (bp *bucketProvisioner) grantObjectPermissions(ctx context.Context, bucketName string, creatorAddr string) error {
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

func (bp *bucketProvisioner) enableDelegatedAgent(ctx context.Context, bucketName string) error {
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
