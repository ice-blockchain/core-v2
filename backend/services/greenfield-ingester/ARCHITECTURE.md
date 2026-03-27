# greenfield-ingester Architecture

> Microservice that subscribes to BNB Greenfield blockchain events and enqueues them into a BullMQ-compatible Redis queue for downstream processing.

---

## Data Structures

| Type | Location | Purpose |
|---|---|---|
| `Ingester` | internal/ingester/ingester.go | Main struct: holds client, redis, queue, environment, logger |
| `CreateObjectEvent` | internal/parser/parser.go | Parsed EventCreateObject: BucketName, ObjectName, ContentType, PayloadSize, Checksums, Creator, etc. |
| `UpdateObjectContentEvent` | internal/parser/parser.go | Parsed EventUpdateObjectContent: BucketName, ObjectName, PayloadSize, Checksums, Operator, etc. |
| `Queue` | internal/bullmq/queue.go | BullMQ-compatible Redis queue with deduplication |
| `Config` | internal/config/config.go | Environment-based configuration with validation |

### Redis data layout

- `greenfield-ingester:last-height` -- last processed block height (string)
- Job IDs follow format: `height:txHash:bucket:object` -- deterministic for deduplication
- Jobs stored in BullMQ-compatible Redis format (hash + wait list + metadata + events stream)

---

## API Surface

### HTTP

| Endpoint | Method | Purpose |
|---|---|---|
| `/health-check` | GET | Returns 200 if WebSocket subscription is active, 503 otherwise |

### Internal

```go
func New(client greenfield.Client, redis redis.Cmdable, queue *bullmq.Queue, environment string, logger zerolog.Logger) *Ingester
func (i *Ingester) Run(ctx context.Context) error
func (i *Ingester) IsHealthy() bool
```

---

## Flow

```
Greenfield RPC (WebSocket)
    |
    v
greenfield-client.Subscribe()  -- live events + catch-up
    |
    v
Ingester.Run()  -- event loop
    |
    v
Ingester.processTxEvent()  -- filter + parse events
    |
    v
Ingester.collectJobs()  -- extract CreateObject / UpdateObjectContent
    |
    v
bullmq.Queue.AddJob()  -- deduplicate + enqueue to Redis
    |
    v
Redis (BullMQ format)  -- consumed by downstream Node.js workers
```

---

## Dependencies

| Dependency | Why |
|---|---|
| `greenfield-client` (local) | Greenfield blockchain subscription and event parsing |
| `github.com/redis/go-redis/v9` | Redis client for queue storage and height tracking |
| `github.com/rs/zerolog` | Structured logging |
| `github.com/bnb-chain/greenfield-go-sdk` | Greenfield SDK types |
| `github.com/cosmos/cosmos-sdk` | Cosmos transaction types |
| `github.com/alicebob/miniredis/v2` | In-memory Redis for tests |

---

## Config Options

| Env Var | Required | Default | Description |
|---|---|---|---|
| `GREENFIELD_RPC_URLS` | Yes | -- | Comma-separated RPC endpoints |
| `GREENFIELD_CHAIN_ID` | No | `greenfield_1017-1` | Greenfield chain identifier |
| `GREENFIELD_PRIVATE_KEY` | Yes | -- | Hex-encoded private key |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `QUEUE_NAME` | No | `greenfield-events` | BullMQ queue name in Redis |
| `LOG_LEVEL` | No | `info` | Logging level |
| `ONLINEIO_ENV` | Yes | -- | Environment tag (alphanumeric + hyphens) for event filtering |

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Go (not TypeScript) | Greenfield SDK is Go-native; blockchain type handling is simpler without serialization boundaries |
| BullMQ-compatible Redis format | Downstream workers are Node.js; BullMQ is already the queue standard in the ION backend |
| Deterministic job IDs (`height:txHash:bucket:object`) | Enables at-most-once delivery without external dedup store; survives restarts |
| Redis pipeline for height + jobs | Atomic writes ensure height tracking and job enqueueing are consistent; EXISTS dedup is outside the pipeline because Lua scripts cannot run inside a Redis MULTI/EXEC transaction pipeline -- single-instance ingester makes this safe |
| Last-height persistence in Redis | Enables seamless restart with catch-up from last processed block |
| Health check reflects subscription status | Kubernetes liveness probe can restart the pod if WebSocket drops |
| Event filtering by type | Only EventCreateObject and EventUpdateObjectContent are relevant; reduces noise |
| Environment-based event filtering via SetTag | See section below |

---

## Event Filtering via SetTag

The ingester only receives transactions that belong to its environment (`ONLINEIO_ENV`). Filtering happens at the Greenfield WebSocket level using a Tendermint query:

```
tm.event='Tx' AND greenfield.storage.EventSetTag.tags CONTAINS '<ONLINEIO_ENV>'
```

This query (built by `greenfield-client.DefaultQuery(env)`) instructs the Greenfield RPC node to deliver only transactions where an `EventSetTag` event has a `tags` attribute containing the environment value (e.g. `"dev"`, `"staging"`, `"prod"`).

### How it works

1. **Tag key:** `onlineioEnv` (returned by `greenfield-client.SenderTagKey()`)
2. **At transaction time**, the sender must attach a `MsgSetTag` message to the Greenfield transaction with a `ResourceTags` entry `{Key: "onlineioEnv", Value: "<env>"}`. Without this tag, the transaction will not match the WebSocket query and the ingester will never see it.
3. **The WebSocket filter** checks `greenfield.storage.EventSetTag.tags CONTAINS '<env>'` -- this is a substring match on the serialized tags JSON, so the value must appear literally in the tags payload.

### Example: tagging a bucket and object for `dev`

From the e2e tests (`e2e_test.go`):

```go
onlineIOTags := &storagetypes.ResourceTags{
    Tags: []storagetypes.ResourceTags_Tag{
        {Key: "onlineioEnv", Value: "dev"},
    },
}

// Attach tags when creating the bucket
sdkClient.CreateBucket(ctx, bucketName, primarySP, gnfdtypes.CreateBucketOptions{
    Tags: onlineIOTags,
})

// Attach tags when creating the object
sdkClient.CreateObject(ctx, bucketName, objectName, reader, gnfdtypes.CreateObjectOptions{
    Tags: onlineIOTags,
})
```

Both `CreateBucket` and `CreateObject` include the `onlineioEnv` tag. The resulting on-chain `MsgSetTag` event causes the transaction to match the ingester's WebSocket query for the corresponding environment.

### Environment isolation

Each environment (`dev`, `staging`, `prod`) runs its own ingester instance with a different `ONLINEIO_ENV` value. Transactions tagged for `dev` are invisible to the `prod` ingester and vice versa. This provides namespace isolation on a shared Greenfield chain without separate chains per environment.
