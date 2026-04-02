package e2e

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"
	"testing"
	"time"

	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	gnfdsdktypes "github.com/bnb-chain/greenfield/sdk/types"
	storageTypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/stretchr/testify/require"
)

func TestSDK_CRUD(t *testing.T) {
	t.Parallel()

	if os.Getenv("TEST_GREENFIELD_PRIVATE_KEY") == "" {
		t.Skip("TEST_GREENFIELD_PRIVATE_KEY not set")
	}

	account := helperNewAccountWithFunds(t)
	bucketName := hex.EncodeToString(account.GetAddress().Bytes())
	objectName := "test-" + rand.Text()[:8] + ".txt"
	payload := []byte("hello greenfield " + rand.Text())

	// Proxy pays gas via fee grant — client must set FeeGranter.
	proxyAccount, err := testProxySDK.GetDefaultAccount()
	require.NoError(t, err)
	txOpt := &gnfdsdktypes.TxOption{FeeGranter: proxyAccount.GetAddress()}

	t.Logf("user:       0x%s", bucketName)
	t.Logf("bucket:     %s", bucketName)
	t.Logf("object:     %s", objectName)
	t.Logf("fee_granter: %s", proxyAccount.GetAddress().String())

	sdk := helperNewClient(t, testProxy.URL, account)

	list, err := sdk.ListStorageProviders(t.Context(), true)
	require.NoError(t, err, "ListStorageProviders")
	require.NotEmpty(t, list, "need at least one active SP")

	t.Run("CreateBucket", func(t *testing.T) {
		txHash, err := sdk.CreateBucket(
			t.Context(), bucketName, list[0].OperatorAddress,
			gnfdtypes.CreateBucketOptions{},
		)
		require.NoError(t, err, "CreateBucket")
		require.NotEmpty(t, txHash)
		t.Logf("CreateBucket tx: %s", txHash)
	})
	t.Run("DelegatePutObject", func(t *testing.T) {
		err = sdk.DelegatePutObject(
			t.Context(), bucketName, objectName,
			int64(len(payload)),
			bytes.NewReader(payload),
			gnfdtypes.PutObjectOptions{
				Visibility:  storageTypes.VISIBILITY_TYPE_PUBLIC_READ,
				ContentType: "text/plain",
			},
		)
		require.NoError(t, err, "DelegatePutObject")
	})
	t.Run("GetObject", func(t *testing.T) {
		reader, stat, err := sdk.GetObject(
			t.Context(), bucketName, objectName,
			gnfdtypes.GetObjectOptions{},
		)
		require.NoError(t, err, "GetObject")
		defer reader.Close()

		got, err := io.ReadAll(reader)
		require.NoError(t, err, "ReadAll")
		require.Equal(t, payload, got, "downloaded content must match uploaded")
		t.Logf("GetObject: %d bytes, content_type=%s", len(got), stat.ContentType)
	})
	t.Run("UpdateObject", func(t *testing.T) {
		updatedPayload := []byte("updated content " + rand.Text())
		t.Run("UpdateObjectContent", func(t *testing.T) {
			var err error
			for range 5 {
				err = sdk.DelegateUpdateObjectContent(
					t.Context(), bucketName, objectName,
					int64(len(updatedPayload)),
					bytes.NewReader(updatedPayload),
					gnfdtypes.PutObjectOptions{},
				)
				if err == nil {
					t.Logf("UpdateObjectContent succeeded")
					break
				}
				t.Logf("DelegateUpdateObjectContent attempt failed: %v", err)
				time.Sleep(time.Second * 2)
			}
			require.NoError(t, err, "UpdateObjectContent")
		})
		t.Run("GetObject", func(t *testing.T) {
			var equal bool
			for range 5 {
				reader, _, err := sdk.GetObject(
					t.Context(), bucketName, objectName,
					gnfdtypes.GetObjectOptions{},
				)
				require.NoError(t, err)

				got, err := io.ReadAll(reader)
				require.NoError(t, err)
				require.NoError(t, reader.Close())

				equal = bytes.Equal(updatedPayload, got)
				if equal {
					t.Logf("GetObject reflects updated content")
					break
				}
				t.Logf("GetObject content does not match updated content, retrying...")
				time.Sleep(time.Second * 2)
			}
			require.True(t, equal, "content should reflect update after several attempts")
		})
	})
	t.Run("DeleteObject", func(t *testing.T) {
		txHash, err := sdk.DeleteObject(
			t.Context(), bucketName, objectName,
			gnfdtypes.DeleteObjectOption{TxOpts: txOpt},
		)
		require.NoError(t, err, "DeleteObject")
		t.Logf("DeleteObject tx: %s", txHash)

		_, err = sdk.WaitForTx(t.Context(), txHash)
		require.NoError(t, err, "WaitForTx DeleteObject")
	})
	t.Run("DeleteBucket", func(t *testing.T) {
		_, err := sdk.DeleteBucket(
			t.Context(), bucketName,
			gnfdtypes.DeleteBucketOption{TxOpts: txOpt},
		)
		require.NoError(t, err, "DeleteBucket by user")
	})
}
