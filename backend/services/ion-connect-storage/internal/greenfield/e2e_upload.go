//go:build e2e

package greenfield

import (
	"bytes"
	"context"
	"encoding/hex"
	"log/slog"
	"os"
	"testing"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	sptypes "github.com/bnb-chain/greenfield/x/sp/types"
	storagetypes "github.com/bnb-chain/greenfield/x/storage/types"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/stretchr/testify/require"
)

const (
	E2EChainID = "greenfield_5600-1"
	E2ERPCURL  = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443"
	E2EEnv     = "dev"
)

// E2ELogger creates a debug-level logger for e2e tests.
func E2ELogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

// CreateE2EClient creates a greenfield-client for e2e tests.
func CreateE2EClient(t *testing.T, privKey string) greenfieldclient.Client {
	t.Helper()
	c, err := greenfieldclient.New(greenfieldclient.Config{
		RpcURLs:    []string{E2ERPCURL},
		ChainID:    E2EChainID,
		PrivateKey: privKey,
		Logger:     greenfieldclient.NewSlogAdapter(E2ELogger()),
	})
	require.NoError(t, err)
	return c
}

// UploadToGreenfield uploads payload + .ionstorage to Greenfield testnet.
func UploadToGreenfield(
	t *testing.T, ctx context.Context,
	privKey, bucketName, objectName string,
	payload, ionStorageData []byte, bagID [32]byte,
) {
	t.Helper()
	account, err := gnfdtypes.NewAccountFromPrivateKey("e2e", privKey)
	require.NoError(t, err)
	sdkClient, err := gnfdclient.New(E2EChainID, E2ERPCURL, gnfdclient.Option{DefaultAccount: account})
	require.NoError(t, err)

	sps, err := sdkClient.ListStorageProviders(ctx, true)
	require.NoError(t, err)
	require.NotEmpty(t, sps)

	// Try SPs in order; some testnet SPs may be unreachable.
	pickReachableSP(t, ctx, sdkClient, sps, bucketName)
	uploadE2EObject(t, ctx, sdkClient, bucketName, objectName, payload, bagID)
	uploadE2EMetadataObject(t, ctx, sdkClient, bucketName, objectName, ionStorageData)
}

func pickReachableSP(t *testing.T, ctx context.Context, client gnfdclient.IClient, sps []sptypes.StorageProvider, bucket string) string {
	t.Helper()
	tags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{{Key: "onlineioEnv", Value: E2EEnv}},
	}
	for _, sp := range sps {
		addr := sp.GetOperatorAddress()
		_, err := client.CreateBucket(ctx, bucket, addr, gnfdtypes.CreateBucketOptions{
			Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE, Tags: tags,
		})
		if err == nil {
			t.Logf("using SP: %s", addr)
			return addr
		}
		t.Logf("SP %s failed: %v, trying next", addr, err)
	}
	t.Fatal("no reachable storage provider found")
	return ""
}

func uploadE2EObject(t *testing.T, ctx context.Context, client gnfdclient.IClient, bucket, object string, payload []byte, bagID [32]byte) {
	t.Helper()
	tags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: E2EEnv},
			{Key: "ion-bag-id", Value: hex.EncodeToString(bagID[:])},
		},
	}
	_, err := client.CreateObject(ctx, bucket, object, bytes.NewReader(payload), gnfdtypes.CreateObjectOptions{
		Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE, Tags: tags,
	})
	require.NoError(t, err)
	err = client.PutObject(ctx, bucket, object, int64(len(payload)), bytes.NewReader(payload), gnfdtypes.PutObjectOptions{})
	require.NoError(t, err)
}

func uploadE2EMetadataObject(t *testing.T, ctx context.Context, client gnfdclient.IClient, bucket, object string, data []byte) {
	t.Helper()
	tags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{{Key: "onlineioEnv", Value: E2EEnv}},
	}
	metaName := object + ".ionstorage"
	_, err := client.CreateObject(ctx, bucket, metaName, bytes.NewReader(data), gnfdtypes.CreateObjectOptions{
		Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE, Tags: tags,
	})
	require.NoError(t, err)
	err = client.PutObject(ctx, bucket, metaName, int64(len(data)), bytes.NewReader(data), gnfdtypes.PutObjectOptions{})
	require.NoError(t, err)
}
