//go:build e2e

package ingester

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	sptypes "github.com/bnb-chain/greenfield/x/sp/types"
	storagetypes "github.com/bnb-chain/greenfield/x/storage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

const (
	e2eChainID = "greenfield_5600-1"
	e2eRPCURL  = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443"
)

func TestE2E_IngesterWritesToRedis(t *testing.T) {
	privateKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set, skipping E2E test")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	redisOpts, err := redis.ParseURL(redisURL)
	require.NoError(t, err)

	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()
	require.NoError(t, redisClient.Ping(ctx).Err())

	redisClient.Del(ctx, heightKey)

	gfClient, err := greenfieldclient.New(greenfieldclient.Config{
		RpcURLs:    []string{e2eRPCURL},
		ChainID:    e2eChainID,
		PrivateKey: privateKey,
		Logger:     greenfieldclient.NewZerologAdapter(testLogger()),
	})
	require.NoError(t, err)
	defer gfClient.Close()

	queueName := fmt.Sprintf("e2e-test-%d", time.Now().UnixNano()%100000)
	ing := New(gfClient, redisClient, queueName, "dev", testLogger())

	ingCtx, ingCancel := context.WithCancel(ctx)
	defer ingCancel()

	errCh := make(chan error, 1)
	go func() {
		errCh <- ing.Run(ingCtx)
	}()

	select {
	case err := <-errCh:
		t.Fatalf("ingester exited early: %v", err)
	case <-time.After(3 * time.Second):
	}

	account, err := gnfdtypes.NewAccountFromPrivateKey("e2e-test", privateKey)
	require.NoError(t, err)

	sdkClient, err := gnfdclient.New(e2eChainID, e2eRPCURL, gnfdclient.Option{
		DefaultAccount: account,
	})
	require.NoError(t, err)

	spList, err := sdkClient.ListStorageProviders(ctx, true)
	require.NoError(t, err)
	require.NotEmpty(t, spList)

	primarySP := pickCheapestSP(ctx, sdkClient, spList)
	t.Logf("using storage provider: %s", primarySP)

	bucketName := fmt.Sprintf("e2e-ingest-%d", time.Now().UnixNano()%100000)

	onlineIOTags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: "dev"},
		},
	}

	_, err = sdkClient.CreateBucket(ctx, bucketName, primarySP, gnfdtypes.CreateBucketOptions{
		Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE,
		Tags:       onlineIOTags,
	})
	require.NoError(t, err)
	t.Logf("created bucket %s", bucketName)

	objectName := "test-object.json"
	content := []byte(`{"hello":"world"}`)

	_, err = sdkClient.CreateObject(ctx, bucketName, objectName,
		bytes.NewReader(content), gnfdtypes.CreateObjectOptions{
			ContentType: "application/json",
			Tags:        onlineIOTags,
		},
	)
	require.NoError(t, err)
	t.Logf("created object %s/%s", bucketName, objectName)

	waitKey := fmt.Sprintf("bull:%s:wait", queueName)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	timeout := time.After(60 * time.Second)

	for {
		select {
		case err := <-errCh:
			t.Fatalf("ingester exited while waiting for job: %v", err)
		case <-timeout:
			t.Fatal("timed out waiting for job in Redis")
		case <-ticker.C:
			jobIDs, err := redisClient.LRange(ctx, waitKey, 0, -1).Result()
			require.NoError(t, err)

			var matchingJobID string
			for _, jobID := range jobIDs {
				if strings.Contains(jobID, bucketName) {
					matchingJobID = jobID
					break
				}
			}
			if matchingJobID == "" {
				continue
			}

			t.Logf("found %d total job(s), matched: %s", len(jobIDs), matchingJobID)

			val, err := redisClient.Get(ctx, heightKey).Result()
			require.NoError(t, err)
			require.NotEmpty(t, val)
			t.Logf("last height in redis: %s", val)

			jobKey := fmt.Sprintf("bull:%s:%s", queueName, matchingJobID)
			fields, err := redisClient.HGetAll(ctx, jobKey).Result()
			require.NoError(t, err)
			require.NotEmpty(t, fields, "job hash %s should exist", jobKey)

			require.Equal(t, "EventCreateObject", fields["name"])
			require.NotEmpty(t, fields["data"])
			require.NotEmpty(t, fields["timestamp"])

			var jobData map[string]interface{}
			require.NoError(t, json.Unmarshal([]byte(fields["data"]), &jobData))
			require.Equal(t, objectName, jobData["object_name"])
			require.Equal(t, bucketName, jobData["bucket_name"])
			require.Equal(t, "application/json", jobData["content_type"])
			require.NotNil(t, jobData["create_at"], "job data should include create_at")
			require.NotNil(t, jobData["version"], "job data should include version")
			t.Logf("verified job: name=%s bucket=%s object=%s content_type=%s",
				fields["name"], jobData["bucket_name"], jobData["object_name"], jobData["content_type"])

			ingCancel()
			return
		}
	}
}

func pickCheapestSP(
	ctx context.Context,
	client gnfdclient.IClient,
	spList []sptypes.StorageProvider,
) string {
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
