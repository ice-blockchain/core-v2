//go:build e2e

package greenfieldclient

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/akuity/grpc-gateway-client/pkg/grpc/gateway"
	gnfdclient "github.com/bnb-chain/greenfield-go-sdk/client"
	gnfdtypes "github.com/bnb-chain/greenfield-go-sdk/types"
	sptypes "github.com/bnb-chain/greenfield/x/sp/types"
	storagetypes "github.com/bnb-chain/greenfield/x/storage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

const (
	e2eChainID = "greenfield_5600-1"
	e2eRPCURL  = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443"
)

func TestE2E_SubscribeAndReceiveEvent(t *testing.T) {
	privateKey := os.Getenv("GREENFIELD_E2E_PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("GREENFIELD_E2E_PRIVATE_KEY not set, skipping E2E test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

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

	bucketName := fmt.Sprintf("e2e-test-%d", time.Now().UnixNano()%100000)

	client, err := New(Config{
		RpcURLs:    []string{e2eRPCURL},
		ChainID:    e2eChainID,
		PrivateKey: privateKey,
	})
	require.NoError(t, err)
	defer client.Close()

	eventCh, err := client.Subscribe(ctx, SubscribeOpts{
		Query: DefaultQuery("dev"),
	})
	require.NoError(t, err)

	time.Sleep(2 * time.Second)

	onlineIOTags := &storagetypes.ResourceTags{
		Tags: []storagetypes.ResourceTags_Tag{
			{Key: "onlineioEnv", Value: "dev"},
		},
	}

	createBucketTx, err := sdkClient.CreateBucket(ctx, bucketName, primarySP, gnfdtypes.CreateBucketOptions{
		Visibility: storagetypes.VISIBILITY_TYPE_PRIVATE,
		Tags:       onlineIOTags,
	})
	require.NoError(t, err)
	t.Logf("created bucket %s, tx=%s", bucketName, createBucketTx)

	objectName := "test-object.json"
	content := []byte(`{"hello":"world"}`)

	createObjTx, err := sdkClient.CreateObject(ctx, bucketName, objectName,
		bytes.NewReader(content), gnfdtypes.CreateObjectOptions{
			ContentType: "application/json",
			Tags:        onlineIOTags,
		},
	)
	require.NoError(t, err)
	t.Logf("created object %s/%s, tx=%s", bucketName, objectName, createObjTx)

	timeout := time.After(60 * time.Second)
	var receivedEvent *TxEvent

	for receivedEvent == nil {
		select {
		case <-timeout:
			t.Fatal("timed out waiting for event")
		case event, ok := <-eventCh:
			if !ok {
				t.Fatal("event channel closed unexpectedly")
			}
			t.Logf("got event at height %d with %d sub-events", event.Height, len(event.Events))
			for _, e := range event.Events {
				if e.Type == "greenfield.storage.EventCreateObject" {
					receivedEvent = event
				}
			}
		}
	}

	require.NotNil(t, receivedEvent)
	require.Greater(t, receivedEvent.Height, int64(0))
	require.NotEmpty(t, receivedEvent.TxHash)
	t.Logf("received event at height=%d tx=%s", receivedEvent.Height, receivedEvent.TxHash)
}

const (
	catchUpTestLCDURL = "https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org:443"
	catchUpFromHeight = int64(29369006)
	catchUpToHeight   = int64(29369067)
	expectedTxHash1   = "E012E9347D46509E73617F97FA90AEE56387E4DD3AD6D3CFE2BB61887DBC73D2"
	expectedTxHash2   = "D1C7F9F140D6F09172C015CAA255A675E4E24B6C90E5C0370617D7F7B322B3BA"
)

func TestE2E_CatchUpBlockRange(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	c := &client{
		rpcURLs: []string{catchUpTestLCDURL},
		log:     zerolog.New(zerolog.NewTestWriter(t)),
	}
	c.gwClient = gateway.NewClient(catchUpTestLCDURL)

	ch := make(chan *TxEvent, 100)
	err := c.catchUp(ctx, catchUpFromHeight, catchUpToHeight, ch)
	close(ch)
	require.NoError(t, err)

	var events []*TxEvent
	for ev := range ch {
		events = append(events, ev)
	}

	require.Equal(t, 2, len(events), "expected 2 TxEvents in range %d-%d", catchUpFromHeight, catchUpToHeight)

	require.Equal(t, catchUpFromHeight, events[0].Height)
	require.Equal(t, expectedTxHash1, events[0].TxHash)
	require.NotEmpty(t, events[0].Events)
	t.Logf("event[0]: height=%d tx=%s events=%d", events[0].Height, events[0].TxHash, len(events[0].Events))

	require.Equal(t, catchUpToHeight, events[1].Height)
	require.Equal(t, expectedTxHash2, events[1].TxHash)
	require.NotEmpty(t, events[1].Events)
	t.Logf("event[1]: height=%d tx=%s events=%d", events[1].Height, events[1].TxHash, len(events[1].Events))

	for _, ev := range events {
		hasCreateObject := false
		for _, e := range ev.Events {
			if e.Type == eventTypeCreateObject {
				hasCreateObject = true
				require.NotEmpty(t, e.Attributes["bucket_name"])
				require.NotEmpty(t, e.Attributes["object_name"])
				require.NotEmpty(t, e.Attributes["create_at"], "missing create_at in catch-up event")
				require.NotEmpty(t, e.Attributes["version"], "missing version in catch-up event")
			}
		}
		require.True(t, hasCreateObject, "missing EventCreateObject")
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
