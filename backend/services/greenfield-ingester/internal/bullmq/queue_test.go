package bullmq

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func setupTestRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	return mr, client
}

func TestAddJob_SkipsDuplicate(t *testing.T) {
	mr, client := setupTestRedis(t)
	defer mr.Close()

	ctx := context.Background()
	q := NewQueue("test-queue", client)
	jobID := "100:TX100:bucket:object"
	data := json.RawMessage(`{"key":"value"}`)

	pipe := client.TxPipeline()
	created, err := q.AddJob(ctx, pipe, "TestJob", data, jobID)
	require.NoError(t, err)
	require.True(t, created)
	_, err = pipe.Exec(ctx)
	require.NoError(t, err)

	waitKey := "bull:test-queue:wait"
	count, err := client.LLen(ctx, waitKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), count)

	jobKey := "bull:test-queue:" + jobID
	jobExists, err := client.Exists(ctx, jobKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), jobExists)

	pipe2 := client.TxPipeline()
	created2, err := q.AddJob(ctx, pipe2, "TestJob", data, jobID)
	require.NoError(t, err)
	require.False(t, created2)
	_, err = pipe2.Exec(ctx)
	require.NoError(t, err)

	count, err = client.LLen(ctx, waitKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), count)
}

func TestAddJob_CreatesJobHash(t *testing.T) {
	mr, client := setupTestRedis(t)
	defer mr.Close()

	ctx := context.Background()
	q := NewQueue("test-queue", client)
	jobID := "200:TX200:bucket:object"
	data := json.RawMessage(`{"bucket":"test"}`)

	pipe := client.TxPipeline()
	created, err := q.AddJob(ctx, pipe, "EventCreateObject", data, jobID)
	require.NoError(t, err)
	require.True(t, created)
	_, err = pipe.Exec(ctx)
	require.NoError(t, err)

	jobKey := "bull:test-queue:" + jobID
	fields, err := client.HGetAll(ctx, jobKey).Result()
	require.NoError(t, err)
	require.Equal(t, "EventCreateObject", fields["name"])
	require.Equal(t, `{"bucket":"test"}`, fields["data"])
}

func TestAddJob_WritesMetaAndEvents(t *testing.T) {
	mr, client := setupTestRedis(t)
	defer mr.Close()

	ctx := context.Background()
	q := NewQueue("test-queue", client)
	data := json.RawMessage(`{}`)

	pipe := client.TxPipeline()
	_, err := q.AddJob(ctx, pipe, "Job", data, "j1")
	require.NoError(t, err)
	_, err = pipe.Exec(ctx)
	require.NoError(t, err)

	metaKey := "bull:test-queue:meta"
	val, err := client.HGet(ctx, metaKey, "opts.maxLenEvents").Result()
	require.NoError(t, err)
	require.Equal(t, "10000", val)

	eventsKey := "bull:test-queue:events"
	streamLen, err := client.XLen(ctx, eventsKey).Result()
	require.NoError(t, err)
	require.Equal(t, int64(1), streamLen)
}
