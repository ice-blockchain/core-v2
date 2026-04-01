package ingester

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	greenfieldclient "github.com/ice-blockchain/ion/packages/greenfield-client"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

func testLogger() zerolog.Logger {
	return zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		Level(zerolog.DebugLevel).
		With().Timestamp().Logger()
}

type mockClient struct {
	events []*greenfieldclient.TxEvent
}

func (m *mockClient) Subscribe(
	ctx context.Context,
	opts greenfieldclient.SubscribeOpts,
) (<-chan *greenfieldclient.TxEvent, error) {
	ch := make(chan *greenfieldclient.TxEvent, len(m.events))
	for _, e := range m.events {
		ch <- e
	}
	close(ch)
	return ch, nil
}

func (m *mockClient) GetObject(
	_ context.Context, _, _ string, _ greenfieldclient.GetObjectOpts,
) (io.ReadCloser, greenfieldclient.ObjectStat, error) {
	return nil, greenfieldclient.ObjectStat{}, nil
}

func (m *mockClient) FGetObject(
	_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts,
) error {
	return nil
}

func (m *mockClient) FGetObjectResumable(
	_ context.Context, _, _, _ string, _ greenfieldclient.GetObjectOpts,
) error {
	return nil
}

func (m *mockClient) IsSubscribed() bool { return true }

func (m *mockClient) Close() error { return nil }

func setupTestRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	return mr, client
}

func TestIngester_ProcessCreateObjectEvent(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 29331798,
			TxHash: "ABCDEF123456",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"bucket_name":  "test-bucket",
						"object_name":  "test-object.json",
						"content_type": "application/json",
						"create_at":    "1774432372",
						"creator":      "0x65a16d6052f597A137639B824f6667fE70D36173",
						"payload_size": "1024",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ingester := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ingester.Run(ctx)
	require.NoError(t, err)

	storedHeight, err := redisClient.Get(ctx, heightKey).Result()
	require.NoError(t, err)
	require.Equal(t, "29331798", storedHeight)
}

func TestIngester_LoadsLastHeight(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	ctx := context.Background()
	redisClient.Set(ctx, heightKey, "12345", 0)

	mock := &mockClient{events: nil}
	ingester := New(mock, redisClient, "test-queue", "dev", testLogger())

	height, err := ingester.loadLastHeight(ctx)
	require.NoError(t, err)
	require.Equal(t, int64(12345), height)
}

func TestIngester_LoadsLastHeight_NotSet(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	mock := &mockClient{events: nil}
	ingester := New(mock, redisClient, "test-queue", "dev", testLogger())

	height, err := ingester.loadLastHeight(context.Background())
	require.NoError(t, err)
	require.Equal(t, int64(0), height)
}

func TestIngester_UpdateObjectContentEvent(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 29331800,
			TxHash: "DEADBEEF",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventUpdateObjectContent",
					Attributes: map[string]string{
						"operator":     "0x89A1CC91B642DECbC478947469C606E0E0c420b",
						"bucket_name":  "my-bucket",
						"object_name":  "updated.json",
						"payload_size": "2048",
						"version":      "3",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ingester := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ingester.Run(ctx)
	require.NoError(t, err)

	storedHeight, err := redisClient.Get(ctx, heightKey).Result()
	require.NoError(t, err)

	h, _ := strconv.ParseInt(storedHeight, 10, 64)
	require.Equal(t, int64(29331800), h)
}

func TestIngester_JobIDFormat(t *testing.T) {
	jobID := formatJobID(29331798, "ABCDEF", "my-bucket", "my-object")
	require.Equal(t, "29331798:ABCDEF:my-bucket:my-object", jobID)
}

func TestIngester_SkipsIrrelevantEvents(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 100,
			TxHash: "AAA",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type:       "message",
					Attributes: map[string]string{"action": "something"},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ingester := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := ingester.Run(ctx)
	require.NoError(t, err)

	_, err = redisClient.Get(ctx, heightKey).Result()
	require.Equal(t, redis.Nil, err)
}

// Verify JSON serialization of job data
func TestJobDataSerialization(t *testing.T) {
	data := map[string]interface{}{
		"block_height": 29331798,
		"tx_hash":      "ABCDEF",
		"bucket_name":  "test",
		"object_name":  "obj.json",
	}

	jsonData, err := json.Marshal(data)
	require.NoError(t, err)
	require.Contains(t, string(jsonData), `"block_height":29331798`)
	require.Contains(t, string(jsonData), `"bucket_name":"test"`)
}

func TestIngester_AtomicHeightAndJobWrite(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 500,
			TxHash: "TX500",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"bucket_name":  "atomic-bucket",
						"object_name":  "atomic-obj.json",
						"content_type": "application/json",
						"payload_size": "512",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ing := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ing.Run(ctx)
	require.NoError(t, err)

	storedHeight, err := redisClient.Get(ctx, heightKey).Result()
	require.NoError(t, err)
	require.Equal(t, "500", storedHeight)

	jobKey := "bull:test-queue:500:TX500:atomic-bucket:atomic-obj.json"
	exists, err := redisClient.Exists(ctx, jobKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), exists)
}

func TestIngester_SanitizesSpecialCharsInJobID(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 600,
			TxHash: "TX600",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"bucket_name":  "bad:bucket:name",
						"object_name":  "evil:object:name.json",
						"content_type": "text/plain",
						"payload_size": "100",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ing := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ing.Run(ctx)
	require.NoError(t, err)

	sanitizedKey := "bull:test-queue:600:TX600:bad_bucket_name:evil_object_name.json"
	exists, err := redisClient.Exists(ctx, sanitizedKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), exists)
}

func TestIngester_PartialFailureDoesNotUpdateHeight(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 700,
			TxHash: "TX700",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"object_name": "missing-bucket.json",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ing := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ing.Run(ctx)
	require.NoError(t, err)

	_, err = redisClient.Get(ctx, heightKey).Result()
	require.Equal(t, redis.Nil, err)
}

func TestSanitizeJobIDComponent(t *testing.T) {
	require.Equal(t, "no_colons_here", sanitizeJobIDComponent("no:colons:here"))
	require.Equal(t, "normal-name", sanitizeJobIDComponent("normal-name"))
	require.Equal(t, "", sanitizeJobIDComponent(""))
}

func TestIngester_MultiEventTransaction_AtomicWrite(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	events := []*greenfieldclient.TxEvent{
		{
			Height: 900,
			TxHash: "TX900",
			Events: []greenfieldclient.ABCIEvent{
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"bucket_name":  "multi-bucket",
						"object_name":  "first.json",
						"content_type": "application/json",
						"payload_size": "100",
					},
				},
				{
					Type: "greenfield.storage.EventCreateObject",
					Attributes: map[string]string{
						"bucket_name":  "multi-bucket",
						"object_name":  "second.json",
						"content_type": "application/json",
						"payload_size": "200",
					},
				},
			},
		},
	}

	mock := &mockClient{events: events}
	ing := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ing.Run(ctx)
	require.NoError(t, err)

	storedHeight, err := redisClient.Get(ctx, heightKey).Result()
	require.NoError(t, err)
	require.Equal(t, "900", storedHeight)

	job1Key := "bull:test-queue:900:TX900:multi-bucket:first.json"
	job2Key := "bull:test-queue:900:TX900:multi-bucket:second.json"

	exists1, err := redisClient.Exists(ctx, job1Key).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), exists1)

	exists2, err := redisClient.Exists(ctx, job2Key).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), exists2)

	waitKey := "bull:test-queue:wait"
	count, err := redisClient.LLen(ctx, waitKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(2), count)
}

func TestIngester_DuplicateEventDoesNotCreateDuplicateJob(t *testing.T) {
	_, redisClient := setupTestRedis(t)

	event := &greenfieldclient.TxEvent{
		Height: 1000,
		TxHash: "TX1000",
		Events: []greenfieldclient.ABCIEvent{
			{
				Type: "greenfield.storage.EventCreateObject",
				Attributes: map[string]string{
					"bucket_name":  "dedup-bucket",
					"object_name":  "same.json",
					"content_type": "application/json",
					"payload_size": "50",
				},
			},
		},
	}

	mock := &mockClient{events: []*greenfieldclient.TxEvent{event, event}}
	ing := New(mock, redisClient, "test-queue", "dev", testLogger())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ing.Run(ctx)
	require.NoError(t, err)

	waitKey := "bull:test-queue:wait"
	count, err := redisClient.LLen(ctx, waitKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), count)
}
