package greenfieldclient

import (
	"encoding/json"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	ctypes "github.com/cometbft/cometbft/rpc/core/types"
	"github.com/stretchr/testify/require"
)

func hasOnlineIOTag(t *testing.T, events []ABCIEvent, senderTag string) bool {
	t.Helper()
	for _, e := range events {
		if e.Type == "greenfield.storage.EventSetTag" {
			if tags, ok := e.Attributes["tags"]; ok {
				if strings.Contains(tags, senderTag) {
					return true
				}
			}
		}
	}
	return false
}

func TestParseTxResponse_FullPayload(t *testing.T) {
	events := map[string][]string{
		"tx.hash":   {"90B5A5084BC255A37C222294D023883D4ED06E9A72D37E405924007D96AA2C83"},
		"tx.height": {"29331798"},
		"greenfield.storage.EventSetTag.tags": {
			`{"tags":[{"key":"onlineioEnv","value":"dev"}]}`,
		},
	}

	dataPayload := map[string]interface{}{
		"height": 29331798,
		"result": map[string]interface{}{
			"events": []interface{}{
				map[string]interface{}{
					"type": "greenfield.storage.EventCreateBucket",
					"attributes": []interface{}{
						map[string]interface{}{
							"key":   "bucket_name",
							"value": `"user-bucket3"`,
							"index": true,
						},
						map[string]interface{}{
							"key":   "create_at",
							"value": `"1774432372"`,
							"index": true,
						},
					},
				},
				map[string]interface{}{
					"type": "greenfield.storage.EventSetTag",
					"attributes": []interface{}{
						map[string]interface{}{
							"key":   "resource",
							"value": `"grn:b::user-bucket3"`,
							"index": true,
						},
						map[string]interface{}{
							"key":   "tags",
							"value": `{"tags":[{"key":"onlineioEnv","value":"dev"}]}`,
							"index": true,
						},
					},
				},
			},
		},
	}

	dataBytes, err := json.Marshal(dataPayload)
	require.NoError(t, err)

	var dataInterface interface{}
	err = json.Unmarshal(dataBytes, &dataInterface)
	require.NoError(t, err)

	result := ctypes.ResultEvent{
		Events: events,
		Data:   dataInterface,
	}

	txEvent, err := ParseTxResponse(result)
	require.NoError(t, err)
	require.NotNil(t, txEvent)

	require.Equal(t, int64(29331798), txEvent.Height)
	require.Equal(t, "90B5A5084BC255A37C222294D023883D4ED06E9A72D37E405924007D96AA2C83", txEvent.TxHash)
	require.Len(t, txEvent.Events, 2)

	bucketEvent := txEvent.Events[0]
	require.Equal(t, "greenfield.storage.EventCreateBucket", bucketEvent.Type)
	require.Equal(t, "user-bucket3", bucketEvent.Attributes["bucket_name"])
	require.Equal(t, "1774432372", bucketEvent.Attributes["create_at"])

	tagEvent := txEvent.Events[1]
	require.Equal(t, "greenfield.storage.EventSetTag", tagEvent.Type)
	require.Equal(t, "grn:b::user-bucket3", tagEvent.Attributes["resource"])
	require.Contains(t, tagEvent.Attributes["tags"], `"key":"onlineioEnv","value":"dev"`)
}

func TestParseTxResponse_NilData(t *testing.T) {
	result := ctypes.ResultEvent{
		Events: map[string][]string{},
	}

	txEvent, err := ParseTxResponse(result)
	require.NoError(t, err)
	require.Nil(t, txEvent)
}

func TestHasOnlineIOTag(t *testing.T) {
	tagKey := SenderTagKey()

	events := []ABCIEvent{
		{
			Type: "greenfield.storage.EventSetTag",
			Attributes: map[string]string{
				"tags": `{"tags":[{"key":"onlineioEnv","value":"dev"}]}`,
			},
		},
	}
	require.True(t, hasOnlineIOTag(t, events, tagKey))

	noTagEvents := []ABCIEvent{
		{
			Type: "greenfield.storage.EventSetTag",
			Attributes: map[string]string{
				"tags": `{"tags":[{"key":"sender","value":"other"}]}`,
			},
		},
	}
	require.False(t, hasOnlineIOTag(t, noTagEvents, tagKey))
}

func TestRotateGateway(t *testing.T) {
	c := &client{
		rpcURLs: []string{"http://rpc1", "http://rpc2", "http://rpc3"},
		log:     &nopLogger{},
	}

	c.rotateGateway()
	require.NotNil(t, c.gwClient)
	require.Equal(t, "http://rpc2", c.currentRPC())

	c.rotateGateway()
	require.Equal(t, "http://rpc3", c.currentRPC())
}

func TestNextRPC_RoundRobin(t *testing.T) {
	c := &client{
		rpcURLs: []string{"http://rpc1", "http://rpc2", "http://rpc3"},
	}

	url1 := c.nextRPC()
	url2 := c.nextRPC()
	url3 := c.nextRPC()
	url4 := c.nextRPC()

	require.Equal(t, "http://rpc2", url1)
	require.Equal(t, "http://rpc3", url2)
	require.Equal(t, "http://rpc1", url3)
	require.Equal(t, "http://rpc2", url4)
}

func TestGetGnfdClient_ConcurrentWithRotate(t *testing.T) {
	c := &client{
		rpcURLs: []string{"http://rpc1", "http://rpc2", "http://rpc3"},
		cfg:     Config{ChainID: "test-chain"},
		log:     &nopLogger{},
	}

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			_ = c.getGnfdClient()
		}()
		go func() {
			defer wg.Done()
			c.rotateGateway()
		}()
	}
	wg.Wait()
}

func TestLastHeight_NeverRegresses(t *testing.T) {
	var lastHeight atomic.Int64
	lastHeight.Store(100)

	heights := []int64{99, 101, 98, 102, 100, 103}
	for _, h := range heights {
		if h > lastHeight.Load() {
			lastHeight.Store(h)
		}
	}
	require.Equal(t, int64(103), lastHeight.Load())
}

func TestDefaultQuery_RejectsSpecialCharacters(t *testing.T) {
	valid := []string{"dev", "staging", "prod", "staging-1"}
	for _, env := range valid {
		result := DefaultQuery(env)
		require.Contains(t, result, env)
	}

	invalid := []string{"dev'--", "prod OR 1=1", "DEV", "dev;drop", "dev test"}
	for _, env := range invalid {
		require.Panics(t, func() { DefaultQuery(env) }, "expected panic for %q", env)
	}
}
