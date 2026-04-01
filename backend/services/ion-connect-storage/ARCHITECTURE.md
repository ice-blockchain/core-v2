# ION Connect Storage -- Architecture

## Purpose

Virtual TON Storage protocol node that serves files cached from BNB Greenfield. Listens on ADNL/RLDP, implements TON storage RPC methods, and uses an LRU+TTL disk cache. Designed to scale to millions of bags using lazy DHT registration, CRDT-based cluster coordination, and hot/cold classification.

## Current State: Phase 2 (Greenfield Connection + Index Building)

Phase 1 (ADNL server, DHT registration, overlay management) is complete. Phase 2 adds Greenfield event subscription, bag index (in-memory + PebbleDB), metadata/segment fetching, and request coalescing.

## Data Structures

### Config (`internal/config/config.go`)
- `Config` struct parsed from environment variables
- Required: `ADNL_PRIVATE_KEY`, `PORT`, `ADNL_EXTERNAL_ADDR`, `GLOBAL_CONFIG_URL`, `GREENFIELD_RPC_URLS`, `GREENFIELD_PRIVATE_KEY`, `ONLINEIO_ENV`
- Defaults: `CACHE_TTL=24h`, `ACTIVE_DHT_LIMIT=100000`, `HTTP_PORT=8080`, `DATA_DIR=/data/db`

### Server (`internal/adnl/server.go`)
- Wraps `adnl.Gateway` (UDP transport) and `dht.Client` (Kademlia DHT)
- Owns `DHTRegistrar` and `OverlayManager`
- Binds on `0.0.0.0:PORT`, advertises `ADNL_EXTERNAL_ADDR` in DHT
- Extracts DHT bootstrap nodes from TON global config for the sweeper
- `Start`: binds UDP, sets external address list, registers self in DHT, starts sweep goroutine
- `Stop`: stops registrar, closes DHT client, closes gateway

### DHTRegistrar (`internal/adnl/dht_registrar.go`)
- Uses `dht.Client.StoreOverlayNodes` for immediate per-bag registration (instant discoverability)
- LRU cache capped at `ActiveDHTLimit` (default 100K) with eviction callback
- **Region index** (`map[uint8]map[[32]byte]struct{}`): bags indexed by first byte of their DHT key for O(1) region lookups. No iteration over all keys during sweep.
- LRU eviction automatically cleans the region index
- Background sweep goroutine processes one of 256 regions per tick

### Sweeper (`internal/adnl/sweep.go` + `kademlia.go`)
- **Provide Sweep pattern**: one Kademlia walk per keyspace region, batch-store all bag values to the same K=7 nodes
- Bypasses `dht.Client.Store` -- sends raw `dht.FindNode` and `dht.Store` TL messages via `gateway.RegisterClient` + `peer.Query`
- `walkToClosest`: iterative Kademlia walk starting from global config bootstrap nodes, converges to K=7 closest DHT nodes for a target key
- `batchStore`: sends `dht.Store` for N bag values to K peers concurrently (N*K messages, 1 walk)
- `buildOverlayValue`: constructs `dht.Value` with `UpdateRuleOverlayNodes` for overlay node announcements

### OverlayManager (`internal/adnl/overlay_manager.go`)
- LRU cache capped at `ActiveDHTLimit`
- Overlays joined on demand only (lazy), never at startup
- Overlay query handling (GetRandomPeers, storage RPC) deferred to Phase 4

### Persister (`internal/index/persist.go`)
- Two-tier bag index: in-memory `xsync.Map[[32]byte, BagLocation]` for fast reads, backed by PebbleDB for durability
- `LookupBag`: checks memory first, falls back to PebbleDB and promotes on hit (lazy warm-up after restart)
- `PersistBagsAndHeight`: atomic `pebble.Batch` writes all bag entries + block height, then updates in-memory index
- `LoadLastHeight`: reads last processed block height for subscription resume
- Key scheme: `idx/height` (8-byte big-endian int64), `idx/bag/<32-byte-bagID>` (JSON `{bucket, object}`)
- `BagLocation{BucketName, ObjectName}` maps a bag ID to its Greenfield coordinates

### Subscriber (`internal/index/subscriber.go`)
- Consumes Greenfield blockchain events via `greenfield-client.Subscribe`
- Query: filters for transactions with both `onlineioEnv` and `ion-bag-id` tags (`BagIndexQuery`)
- **Event correlation**: scans `EventCreateObject`/`EventUpdateObjectContent` to build known objects set, then matches `EventSetTag` events by GRN-parsed bucket+object. Only SetTag events with a matching CreateObject/UpdateObject are indexed.
- Extracts `ion-bag-id` hex from tag JSON, decodes to `[32]byte`
- Delegates persistence to `Persister.PersistBagsAndHeight`

### Fetcher (`internal/greenfield/fetcher.go`)
- Downloads `.ionstorage` metadata and 16MB data segments from Greenfield
- Embedded `singleflight.Group` deduplicates concurrent requests for the same resource
- `FetchMetadata`: downloads `<object>.ionstorage`, parses BoC into `BagMetadata` (piece size, file size, root hash, header hash, merkle tree root, piece count, bag ID)
- `FetchSegment`: downloads a 16MB segment via `GetObject` with `Range` header, returns `[]byte`. Reader closed immediately after `io.ReadAll` to free HTTP connection.

### BagMetadata (`internal/greenfield/metadata_fetcher.go`)
- Parsed from `.ionstorage` BoC (Bag of Cells) containing a TorrentInfo TVM cell
- TorrentInfo layout: `piece_size` (u32) | `file_size` (u64) | `root_hash` (256 bits) | `header_size` (u64) | `header_hash` (256 bits) | `description` (ref cell)
- `BagID = SHA256(CellRepr(torrentInfoCell))` -- the cell's representation hash
- `PieceCount = ceil(FileSize / PieceSize)`
- `RawBoC` preserved for PebbleDB caching in Phase 3

### Segment Constants (`internal/greenfield/segment_fetcher.go`)
- `SegmentSize = 16MB`, `PieceSize = 512KB`, `PiecesPerSegment = 32`

## API Surface

### Server (public)
```go
NewServer(ctx, ServerConfig, *slog.Logger) (*Server, error)
(*Server) Start(ctx) error
(*Server) Stop(ctx) error
(*Server) DHTRegistrar() *DHTRegistrar
(*Server) OverlayManager() *OverlayManager
(*Server) Gateway() *adnl.Gateway
(*Server) DHTClient() *dht.Client
```

### DHTRegistrar (public type, private constructor)
```go
(*DHTRegistrar) Start(ctx)
(*DHTRegistrar) Stop()
(*DHTRegistrar) Register(ctx, bagID [32]byte) error
(*DHTRegistrar) Deregister(bagID [32]byte)
(*DHTRegistrar) Count() int
```

### OverlayManager (public type, private constructor)
```go
(*OverlayManager) Join(ctx, bagID [32]byte) error
(*OverlayManager) Leave(bagID [32]byte) error
(*OverlayManager) ActiveCount() int
```

### Persister (public)
```go
NewPersister(db *pebble.DB) *Persister
(*Persister) LoadLastHeight() (int64, error)
(*Persister) LookupBag(bagID [32]byte) (BagLocation, bool, error)
(*Persister) PersistBagsAndHeight(entries []BagEntry, height int64) error
```

### Subscriber (public)
```go
NewSubscriber(client, persister, env, logger) *Subscriber
(*Subscriber) Run(ctx context.Context) error
```

### Fetcher (public)
```go
NewFetcher(client greenfieldclient.Client, logger *slog.Logger) *Fetcher
(*Fetcher) FetchMetadata(ctx, bucket, object string) (*BagMetadata, error)
(*Fetcher) FetchSegment(ctx, bucket, object string, segmentIndex int) ([]byte, error)
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/xssnick/tonutils-go` | ADNL gateway, DHT client, overlay networking, TL serialization, TVM cell parsing |
| `github.com/hashicorp/golang-lru/v2` | LRU cache with eviction callbacks |
| `github.com/cockroachdb/pebble/v2` | PebbleDB for durable bag index and block height |
| `github.com/ice-blockchain/ion/packages/greenfield-client` | Greenfield RPC subscription, object download, event parsing |
| `github.com/puzpuzpuz/xsync/v4` | Sharded concurrent map for in-memory bag index |
| `golang.org/x/sync` | singleflight for request coalescing |
| `github.com/stretchr/testify` | Test assertions |

## Design Decisions

- **`PORT` + `ADNL_EXTERNAL_ADDR` required**: no auto-detection of IPs or random ports in production code. Test helpers handle port allocation and external IP detection.
- **Provide Sweep via raw ADNL**: tonutils-go's DHT internals are all unexported. The sweeper sends `dht.FindNode`/`dht.Store` TL messages directly via `gateway.RegisterClient` + `peer.Query`.
- **Region index for O(1) sweep lookups**: with millions of bags, iterating all LRU keys per region tick is prohibitive. A secondary `map[uint8]map[[32]byte]struct{}` provides direct access.
- **Two-tier bag index**: in-memory xsync.Map for hot reads, PebbleDB for durability. No full rebuild on startup -- entries promoted lazily from PebbleDB on first access.
- **Event correlation**: subscriber only indexes SetTag events that have a matching CreateObject/UpdateObject in the same transaction. Prevents indexing orphaned tags.
- **Subscription query**: `BagIndexQuery` filters at the Tendermint level for both `onlineioEnv` and `ion-bag-id` CONTAINS, reducing irrelevant events.
- **Catch-up includes MsgSetTag**: the greenfield-client catch-up path handles `MsgSetTag` messages from historical blocks, ensuring no events are missed after restart.
- **Segments kept in memory**: `FetchSegment` returns `[]byte` (up to 16MB). Reader closed immediately after ReadAll. Phase 3/4 will introduce TeeWriter for simultaneous disk cache + response streaming.
- **singleflight embedded in Fetcher**: no separate Coalescer type. Concurrent requests for the same metadata or segment share one Greenfield fetch.
- **slog over zerolog**: master-plan specifies `slog.Logger` (stdlib). greenfield-client abstracted via Logger interface with zerolog/slog adapters.
- **CGO_ENABLED=0**: tonutils-go and PebbleDB are pure Go, no C dependencies.
