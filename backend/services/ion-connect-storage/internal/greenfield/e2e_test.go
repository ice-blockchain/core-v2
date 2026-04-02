//go:build e2e

package greenfield_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	sptypes "github.com/bnb-chain/greenfield/x/sp/types"
	storagetypes "github.com/bnb-chain/greenfield/x/storage/types"
	"github.com/cockroachdb/pebble/v2"
	sdk "github.com/cosmos/cosmos-sdk/types"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/boc"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/greenfield"
	"github.com/ice-blockchain/ion/services/ion-connect-storage/internal/index"
	"github.com/stretchr/testify/require"
)

const (
	e2eChainID  = "greenfield_5600-1"
	e2eRPCURL   = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443"
	e2eEnv      = "dev"
	payloadSize = 17 * 1024 * 1024 // 17 MB -> 2 segments
)

func e2eLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func generateRandomPayload(t *testing.T, size int) []byte {
	t.Helper()
	buf := make([]byte, size)
	_, err := rand.Read(buf)
	require.NoError(t, err)
	return buf
}

func createTestBucketAndObject(
	t *testing.T,
	ctx context.Context,
	sdkClient gnfdclient.IClient,
	bucketName, objectName string,
	payload []byte,
	bagIDHex, env, primarySP string,
) {
	t.Helper()

	envTags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: env},
		},
	}

	_, err := sdkClient.CreateBucket(ctx, bucketName, primarySP, gnfdtypes.CreateBucketOptions{
		Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE,
		Tags:       envTags,
	})
	require.NoError(t, err)
	t.Logf("created bucket %s", bucketName)

	objectTags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: env},
			{Key: "ion-bag-id", Value: bagIDHex},
		},
	}

	_, err = sdkClient.CreateObject(ctx, bucketName, objectName,
		bytes.NewReader(payload), gnfdtypes.CreateObjectOptions{
			ContentType: "application/octet-stream",
			Tags:        objectTags,
		},
	)
	require.NoError(t, err)
	t.Logf("created object %s/%s (on-chain)", bucketName, objectName)

	err = sdkClient.PutObject(ctx, bucketName, objectName, int64(len(payload)),
		bytes.NewReader(payload), gnfdtypes.PutObjectOptions{})
	require.NoError(t, err)
	t.Logf("uploaded object data %s/%s (%d bytes)", bucketName, objectName, len(payload))
}

func uploadIonStorageMetadata(
	t *testing.T,
	ctx context.Context,
	sdkClient gnfdclient.IClient,
	bucketName, objectName string,
	bocData []byte,
	env string,
) {
	t.Helper()
	metaName := objectName + ".ionstorage"
	metaTags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: env},
		},
	}

	_, err := sdkClient.CreateObject(ctx, bucketName, metaName,
		bytes.NewReader(bocData), gnfdtypes.CreateObjectOptions{
			ContentType: "application/octet-stream",
			Tags:        metaTags,
		},
	)
	require.NoError(t, err)

	err = sdkClient.PutObject(ctx, bucketName, metaName, int64(len(bocData)),
		bytes.NewReader(bocData), gnfdtypes.PutObjectOptions{})
	require.NoError(t, err)
	t.Logf("uploaded metadata %s/%s (%d bytes)", bucketName, metaName, len(bocData))
}

func pickCheapestSP(
	t *testing.T,
	ctx context.Context,
	client gnfdclient.IClient,
	spList []sptypes.StorageProvider,
) string {
	t.Helper()
	best := spList[0].GetOperatorAddress()
	var lowestPrice *sdk.Dec
	for _, sp := range spList {
		price, err := client.GetStoragePrice(ctx, sp.GetOperatorAddress())
		if err != nil {
			continue
		}
		p := price.StorePrice
		if lowestPrice == nil || p.LT(*lowestPrice) {
			lowestPrice = &p
			best = sp.GetOperatorAddress()
		}
	}
	return best
}

func waitForSubscription(t *testing.T, client greenfieldclient.Client, timeout time.Duration) {
	t.Helper()
	deadline := time.After(timeout)
	for {
		select {
		case <-deadline:
			t.Fatal("timed out waiting for websocket subscription to become active")
		default:
			if client.IsSubscribed() {
				t.Log("websocket subscription active")
				return
			}
			time.Sleep(500 * time.Millisecond)
		}
	}
}

func TestE2E_SubscriberIndexesBagWithMetadata(t *testing.T) {
	privateKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set, skipping E2E test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	logger := e2eLogger()

	// Create Greenfield SDK client
	account, err := gnfdtypes.NewAccountFromPrivateKey("e2e-test", privateKey)
	require.NoError(t, err)
	sdkClient, err := gnfdclient.New(e2eChainID, e2eRPCURL, gnfdclient.Option{
		DefaultAccount: account,
	})
	require.NoError(t, err)

	spList, err := sdkClient.ListStorageProviders(ctx, true)
	require.NoError(t, err)
	require.NotEmpty(t, spList)
	primarySP := pickCheapestSP(t, ctx, sdkClient, spList)

	bucketName := fmt.Sprintf("e2e-storage-%d", time.Now().UnixNano()%100000)
	objectName := "test-data"

	payload := generateRandomPayload(t, payloadSize)
	bagID, ionStorageBoC := boc.MustBuildIonStorageBoC(t, payload, boc.PieceSize, boc.SingleFileHeader(objectName, uint64(len(payload))))
	bagIDHex := hex.EncodeToString(bagID[:])
	t.Logf("computed bag ID: %s", bagIDHex)

	// Open temp PebbleDB
	db, err := pebble.Open(t.TempDir(), &pebble.Options{})
	require.NoError(t, err)
	defer db.Close()

	// Create greenfield-client
	gfClient, err := greenfieldclient.New(greenfieldclient.Config{
		RpcURLs:    []string{e2eRPCURL},
		ChainID:    e2eChainID,
		PrivateKey: privateKey,
		Logger:     greenfieldclient.NewSlogAdapter(logger),
	})
	require.NoError(t, err)
	defer gfClient.Close()

	// Set up indexing pipeline
	persister := index.NewPersister(db)
	fetcher := greenfield.NewFetcher(gfClient, logger)

	sub := index.NewSubscriber(gfClient, persister, e2eEnv, logger)

	subCtx, subCancel := context.WithCancel(ctx)
	defer subCancel()

	go func() {
		_ = sub.Run(subCtx)
	}()

	// Wait for websocket subscription to be active before submitting tx
	waitForSubscription(t, gfClient, 15*time.Second)

	// Upload data + .ionstorage metadata AFTER subscriber is connected
	createTestBucketAndObject(t, ctx, sdkClient, bucketName, objectName, payload, bagIDHex, e2eEnv, primarySP)
	uploadIonStorageMetadata(t, ctx, sdkClient, bucketName, objectName, ionStorageBoC, e2eEnv)

	// Poll for indexed bag
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	timeout := time.After(90 * time.Second)

	for {
		select {
		case <-timeout:
			t.Fatal("timed out waiting for bag to be indexed")
		case <-ticker.C:
			loc, found, err := persister.LookupBag(bagID)
			if err != nil {
				t.Fatalf("lookup bag: %v", err)
			}
			if !found {
				continue
			}
			require.Equal(t, bucketName, loc.BucketName)
			require.Equal(t, objectName, loc.ObjectName)
			t.Logf("bag indexed: bucket=%s object=%s", loc.BucketName, loc.ObjectName)

			// Verify PebbleDB persistence
			h, err := persister.LoadLastHeight()
			require.NoError(t, err)
			require.Greater(t, h, int64(0))

			dbLoc, found, err := persister.LookupBag(bagID)
			require.NoError(t, err)
			require.True(t, found)
			require.Equal(t, bucketName, dbLoc.BucketName)

			// Verify metadata fetch
			meta, err := fetcher.FetchMetadata(ctx, bucketName, objectName)
			require.NoError(t, err)
			require.Equal(t, bagID, meta.BagID)
			require.Equal(t, uint64(payloadSize), meta.FileSize)
			require.Equal(t, uint32(boc.PieceSize), meta.PieceSize)
			require.Equal(t, 34, meta.PieceCount) // ceil(17MB / 512KB)
			t.Logf("metadata verified: file_size=%d piece_count=%d", meta.FileSize, meta.PieceCount)

			// Verify segment 0 (16MB)
			seg0, err := fetcher.FetchSegment(ctx, bucketName, objectName, 0, nil)
			require.NoError(t, err)
			require.Equal(t, boc.SegmentSize, len(seg0))
			require.True(t, bytes.Equal(payload[:boc.SegmentSize], seg0))
			t.Logf("segment 0 verified: %d bytes", len(seg0))

			// Verify segment 1 (remaining 1MB)
			seg1, err := fetcher.FetchSegment(ctx, bucketName, objectName, 1, nil)
			require.NoError(t, err)
			require.Equal(t, payloadSize-boc.SegmentSize, len(seg1))
			require.True(t, bytes.Equal(payload[boc.SegmentSize:], seg1))
			t.Logf("segment 1 verified: %d bytes", len(seg1))

			subCancel()
			return
		}
	}
}
