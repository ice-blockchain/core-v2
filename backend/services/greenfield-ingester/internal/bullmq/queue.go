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

// dedupAndSetJob atomically checks if a job exists and creates its hash if not.
// Returns 1 if created, 0 if duplicate. Runs as a Lua script for atomicity.
var dedupAndSetJob = redis.NewScript(`
if redis.call("EXISTS", KEYS[1]) == 1 then
  return 0
end
redis.call("HSET", KEYS[1],
  "name", ARGV[1], "data", ARGV[2], "opts", ARGV[3],
  "timestamp", ARGV[4], "delay", 0, "priority", 0,
  "attemptsMade", 0, "processedOn", 0, "finishedOn", 0,
  "stacktrace", "[]", "returnvalue", "null")
return 1
`)

// AddJob enqueues a job in BullMQ-compatible format.
// Returns true if the job was created, false if it already exists.
// Dedup is atomic via Lua script to prevent TOCTOU races.
func (q *Queue) AddJob(
	ctx context.Context,
	pipe redis.Pipeliner,
	jobName string,
	data json.RawMessage,
	jobID string,
) (bool, error) {
	jobKey := q.toKey(jobID)
	now := time.Now().UnixMilli()
	opts, err := json.Marshal(map[string]interface{}{
		"jobId":    jobID,
		"attempts": 0,
		"delay":    0,
	})
	if err != nil {
		return false, fmt.Errorf("marshal job opts: %w", err)
	}

	created, err := dedupAndSetJob.Run(
		ctx, q.client, []string{jobKey},
		jobName, string(data), string(opts), now,
	).Int()
	if err != nil {
		return false, fmt.Errorf("dedup job %s: %w", jobID, err)
	}
	if created == 0 {
		return false, nil
	}

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
