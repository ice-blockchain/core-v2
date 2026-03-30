package bullmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Queue provides BullMQ-compatible job enqueuing via Redis.
// Key structure matches gobullmq: bull:{name}:{suffix}.
type Queue struct {
	name      string
	client    *redis.Client
	keyPrefix string
}

// NewQueue creates a new BullMQ-compatible queue.
func NewQueue(name string, client *redis.Client) *Queue {
	return &Queue{
		name:      name,
		client:    client,
		keyPrefix: fmt.Sprintf("bull:%s:", name),
	}
}

func (q *Queue) toKey(suffix string) string {
	return q.keyPrefix + suffix
}

// AddJob enqueues a job in BullMQ-compatible format.
// Returns true if the job was created, false if it already exists.
// Dedup uses EXISTS on the job hash key (same as gobullmq Lua script).
func (q *Queue) AddJob(
	ctx context.Context,
	pipe redis.Pipeliner,
	jobName string,
	data json.RawMessage,
	jobID string,
) (bool, error) {
	jobKey := q.toKey(jobID)

	exists, err := q.client.Exists(ctx, jobKey).Result()
	if err != nil {
		return false, fmt.Errorf("check job exists %s: %w", jobID, err)
	}
	if exists > 0 {
		return false, nil
	}

	now := time.Now().UnixMilli()
	opts, err := json.Marshal(map[string]interface{}{
		"jobId":    jobID,
		"attempts": 0,
		"delay":    0,
	})
	if err != nil {
		return false, fmt.Errorf("marshal job opts: %w", err)
	}

	pipe.HSet(ctx, jobKey, map[string]interface{}{
		"name":         jobName,
		"data":         string(data),
		"opts":         string(opts),
		"timestamp":    now,
		"delay":        0,
		"priority":     0,
		"attemptsMade": 0,
		"processedOn":  0,
		"finishedOn":   0,
		"stacktrace":   "[]",
		"returnvalue":  "null",
	})

	pipe.RPush(ctx, q.toKey("wait"), jobID)

	pipe.HSetNX(ctx, q.toKey("meta"), "opts.maxLenEvents", "10000")

	pipe.XAdd(ctx, &redis.XAddArgs{
		Stream: q.toKey("events"),
		MaxLen: 10000,
		Approx: true,
		Values: map[string]interface{}{
			"event": "waiting",
			"jobId": jobID,
		},
	})

	return true, nil
}
