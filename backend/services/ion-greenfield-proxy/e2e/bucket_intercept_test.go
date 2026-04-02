package e2e

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"testing"

	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	permTypes "github.com/bnb-chain/greenfield/x/permission/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/stretchr/testify/require"
)

// TestSDK_CreateBucketIntercept verifies that CreateBucket calls are fully
// intercepted by the proxy. The proxy creates the bucket on its own behalf,
// grants permissions to the user, and returns a success response.
// The user's MsgCreateBucket never reaches the chain or SP.
func TestSDK_CreateBucketIntercept(t *testing.T) {
	t.Parallel()

	if os.Getenv("TEST_GREENFIELD_PRIVATE_KEY") == "" {
		t.Skip("TEST_GREENFIELD_PRIVATE_KEY not set")
	}

	account := helperNewAccountWithFunds(t)
	bucketName := hex.EncodeToString(account.GetAddress().Bytes())
	userAddr := account.GetAddress().String()

	sdk := helperNewClient(t, testProxy.URL, account)

	proxyAccount, err := testProxySDK.GetDefaultAccount()
	require.NoError(t, err)
	proxyAddr := proxyAccount.GetAddress()

	sps, err := sdk.ListStorageProviders(t.Context(), true)
	require.NoError(t, err, "ListStorageProviders")
	require.NotEmpty(t, sps, "need at least one active SP")
	primarySP := sps[0].OperatorAddress

	t.Logf("user:   0x%s", bucketName)
	t.Logf("bucket: %s", bucketName)
	t.Logf("sp:     %s", primarySP)

	t.Run("CreateBucket", func(t *testing.T) {
		txHash, err := sdk.CreateBucket(
			t.Context(), bucketName, primarySP,
			gnfdtypes.CreateBucketOptions{
				Visibility: storageTypes.VISIBILITY_TYPE_PUBLIC_READ,
			},
		)
		require.NoError(t, err, "CreateBucket")
		require.NotEmpty(t, txHash)
		t.Logf("CreateBucket tx: %s", txHash)
	})

	t.Run("HeadBucket", func(t *testing.T) {
		info, err := sdk.HeadBucket(t.Context(), bucketName)
		require.NoError(t, err, "HeadBucket")
		require.Equal(t, proxyAddr.String(), info.Owner,
			"bucket owner must be the proxy")
		t.Logf("owner: %s, visibility: %s", info.Owner, info.Visibility)
	})

	t.Run("Permissions", func(t *testing.T) {
		for _, action := range []permTypes.ActionType{
			permTypes.ACTION_CREATE_OBJECT,
			permTypes.ACTION_DELETE_OBJECT,
			permTypes.ACTION_LIST_OBJECT,
			permTypes.ACTION_DELETE_BUCKET,
		} {
			effect, err := sdk.IsBucketPermissionAllowed(
				t.Context(), userAddr, bucketName, action,
			)
			require.NoError(t, err, "IsBucketPermissionAllowed %s", action)
			require.Equal(t, permTypes.EFFECT_ALLOW, effect,
				"user must have %s permission", action)
		}
	})

	t.Run("DeleteBucket", func(t *testing.T) {
		txHash, err := sdk.DeleteBucket(
			t.Context(), bucketName,
			gnfdtypes.DeleteBucketOption{
				TxOpts: &gnfdsdktypes.TxOption{FeeGranter: proxyAddr},
			},
		)
		require.NoError(t, err, "DeleteBucket by user")

		_, err = sdk.WaitForTx(t.Context(), txHash)
		require.NoError(t, err, "WaitForTx DeleteBucket")
		t.Logf("DeleteBucket tx: %s", txHash)
	})
}

// TestSDK_CreateBucketNonHexPassthrough verifies that CreateBucket with a
// non-hex bucket name is NOT intercepted by the proxy. The request is
// forwarded to the chain as-is, where it fails because the unfunded
// account cannot pay gas.
func TestSDK_CreateBucketNonHexPassthrough(t *testing.T) {
	t.Parallel()

	account := helperNewAccount(t)
	sdk := helperNewClient(t, testProxy.URL, account)

	sps, err := sdk.ListStorageProviders(t.Context(), true)
	require.NoError(t, err)
	require.NotEmpty(t, sps)

	bucketName := "e2e-passthrough-" + strings.ToLower(rand.Text()[:8])

	t.Logf("bucket: %s (non-hex, should not be intercepted)", bucketName)

	_, err = sdk.CreateBucket(
		t.Context(), bucketName, sps[0].OperatorAddress,
		gnfdtypes.CreateBucketOptions{},
	)
	// The account has no funds — the chain rejects it.
	// The important thing is the proxy did NOT intercept and create it.
	require.Error(t, err, "non-hex bucket must not be intercepted")
	t.Logf("expected error: %v", err)

	_, err = sdk.HeadBucket(t.Context(), bucketName)
	require.Error(t, err, "bucket must not exist")
	require.Contains(t, err.Error(), "No such bucket")
}
