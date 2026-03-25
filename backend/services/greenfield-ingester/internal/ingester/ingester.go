package ingester

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	greenfieldclient "github.com/AudiusProject/ion/packages/greenfield-client"
	"github.com/AudiusProject/ion/services/greenfield-ingester/internal/bullmq"
	"github.com/AudiusProject/ion/services/greenfield-ingester/internal/parser"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

const (
	heightKey = "greenfield-ingester:last-height"
)

// Ingester consumes Greenfield events and stores them as BullMQ jobs.
type Ingester struct {
	client      greenfieldclient.Client
	redisClient *redis.Client
	queue       *bullmq.Queue
	onlineIOEnv string
	log         zerolog.Logger
}

// New creates a new Ingester instance.
func New(
	client greenfieldclient.Client,
	redisClient *redis.Client,
	queueName string,
	onlineIOEnv string,
	log zerolog.Logger,
) *Ingester {
	return &Ingester{
		client:      client,
		redisClient: redisClient,
		queue:       bullmq.NewQueue(queueName, redisClient),
		onlineIOEnv: onlineIOEnv,
		log:         log.With().Str("component", "ingester").Logger(),
	}
}

// Run starts the event ingestion loop.
func (i *Ingester) Run(ctx context.Context) error {
	lastHeight, err := i.loadLastHeight(ctx)
	if err != nil {
		return fmt.Errorf("load last height: %w", err)
	}

	subscribeHeight := lastHeight + 1
	if lastHeight == 0 {
		subscribeHeight = 0
	}

	i.log.Info().Int64("height", subscribeHeight).Msg("starting ingester")

	eventCh, err := i.client.Subscribe(ctx, greenfieldclient.SubscribeOpts{
		LastHeight: subscribeHeight,
		Query:      greenfieldclient.DefaultQuery(i.onlineIOEnv),
	})
	if err != nil {
		return fmt.Errorf("subscribe: %w", err)
	}

	for txEvent := range eventCh {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		i.log.Debug().
			Int64("height", txEvent.Height).
			Str("tx", txEvent.TxHash).
			Int("events", len(txEvent.Events)).
			Msg("received tx event")

		if err := i.processTxEvent(ctx, txEvent); err != nil {
			i.log.Error().Err(err).Int64("height", txEvent.Height).Msg("process tx event")
			continue
		}
	}

	return nil
}

type jobEntry struct {
	name       string
	data       json.RawMessage
	bucketName string
	objectName string
}

func (i *Ingester) processTxEvent(
	ctx context.Context,
	txEvent *greenfieldclient.TxEvent,
) error {
	jobs := i.collectJobs(txEvent)
	if len(jobs) == 0 {
		return nil
	}

	pipe := i.redisClient.TxPipeline()

	var enqueued int
	for _, job := range jobs {
		jobID := fmt.Sprintf("%d:%s:%s:%s",
			txEvent.Height, txEvent.TxHash,
			sanitizeJobIDComponent(job.bucketName),
			sanitizeJobIDComponent(job.objectName),
		)

		created, err := i.queue.AddJob(ctx, pipe, job.name, job.data, jobID)
		if err != nil {
			pipe.Discard()
			return fmt.Errorf("add bullmq job: %w", err)
		}

		if created {
			enqueued++
			i.log.Info().
				Str("job", job.name).
				Int64("height", txEvent.Height).
				Str("tx", txEvent.TxHash).
				Str("bucket", job.bucketName).
				Str("object", job.objectName).
				Msg("enqueued job")
		} else {
			i.log.Debug().
				Str("job", job.name).
				Int64("height", txEvent.Height).
				Msg("skipped duplicate job")
		}
	}

	pipe.Set(ctx, heightKey, strconv.FormatInt(txEvent.Height, 10), 0)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("exec redis pipeline: %w", err)
	}

	return nil
}

func (i *Ingester) collectJobs(
	txEvent *greenfieldclient.TxEvent,
) []jobEntry {
	var jobs []jobEntry

	for _, abciEvent := range txEvent.Events {
		switch abciEvent.Type {
		case "greenfield.storage.EventCreateObject":
			parsed, err := parser.ExtractCreateObjectEvent(txEvent, abciEvent)
			if err != nil {
				i.log.Warn().Err(err).Msg("parse CreateObject")
				continue
			}
			dataJSON, err := json.Marshal(parsed)
			if err != nil {
				i.log.Warn().Err(err).Msg("marshal CreateObject")
				continue
			}
			jobs = append(jobs, jobEntry{
				name:       "EventCreateObject",
				data:       dataJSON,
				bucketName: parsed.BucketName,
				objectName: parsed.ObjectName,
			})

		case "greenfield.storage.EventUpdateObjectContent":
			parsed, err := parser.ExtractUpdateObjectContentEvent(txEvent, abciEvent)
			if err != nil {
				i.log.Warn().Err(err).Msg("parse UpdateObjectContent")
				continue
			}
			dataJSON, err := json.Marshal(parsed)
			if err != nil {
				i.log.Warn().Err(err).Msg("marshal UpdateObjectContent")
				continue
			}
			jobs = append(jobs, jobEntry{
				name:       "EventUpdateObjectContent",
				data:       dataJSON,
				bucketName: parsed.BucketName,
				objectName: parsed.ObjectName,
			})
		}
	}

	return jobs
}

// IsHealthy returns true when the WebSocket subscription is active.
func (i *Ingester) IsHealthy() bool {
	return i.client.IsSubscribed()
}

func sanitizeJobIDComponent(s string) string {
	return strings.ReplaceAll(s, ":", "_")
}

func (i *Ingester) loadLastHeight(ctx context.Context) (int64, error) {
	val, err := i.redisClient.Get(ctx, heightKey).Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("get last height: %w", err)
	}

	height, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse stored height %q: %w", val, err)
	}

	return height, nil
}
