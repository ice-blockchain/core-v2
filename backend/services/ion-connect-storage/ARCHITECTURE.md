# ION Connect Storage -- Architecture

## Purpose

Virtual TON Storage protocol node that serves files cached from BNB Greenfield. Listens on ADNL/RLDP, implements TON storage RPC methods, and uses an LRU+TTL disk cache. Designed to scale to millions of bags using lazy DHT registration, CRDT-based cluster coordination, and hot/cold classification.

## Current State: Phase 1 (ADNL Server Setup)

Service starts, connects to TON DHT, registers own ADNL address, responds to overlay peer queries, and shuts down cleanly. No bags registered at startup. Bags are registered on demand via `DHTRegistrar.Register`.

## Data Structures

### Config (`internal/config/config.go`)
- `Config` struct parsed from environment variables
- Required: `ADNL_PRIVATE_KEY`, `PORT`, `ADNL_EXTERNAL_ADDR`, `GLOBAL_CONFIG_URL`, `GREENFIELD_RPC_URLS`, `GREENFIELD_PRIVATE_KEY`, `ONLINEIO_ENV`
- Defaults: `CACHE_TTL=24h`, `ACTIVE_DHT_LIMIT=100000`, `HTTP_PORT=8080`

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

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/xssnick/tonutils-go` | ADNL gateway, DHT client, overlay networking, TL serialization |
| `github.com/hashicorp/golang-lru/v2` | LRU cache with eviction callbacks |
| `github.com/stretchr/testify` | Test assertions |

## Design Decisions

- **`PORT` + `ADNL_EXTERNAL_ADDR` required**: no auto-detection of IPs or random ports in production code. Test helpers handle port allocation and external IP detection.
- **Provide Sweep via raw ADNL**: tonutils-go's DHT internals (`dhtNode`, `buckets`, `priorityList`) are all unexported. The sweeper bypasses `dht.Client.Store` by sending `dht.FindNode`/`dht.Store` TL messages directly via `gateway.RegisterClient` + `peer.Query`. One Kademlia walk per keyspace region, batch-store to shared K=7 nodes.
- **Region index for O(1) sweep lookups**: with millions of bags, iterating all LRU keys per region tick is prohibitive. A secondary `map[uint8]map[[32]byte]struct{}` provides direct access to bags in a given region. Kept in sync via `addToRegionIndex`/`removeFromRegionIndex` and LRU eviction callback.
- **`StoreOverlayNodes` for bag registration**: bags are announced as overlay nodes (keyed by overlay ID derived from bagID), not as ADNL addresses. External TON Storage clients discover bags via `FindOverlayNodes`.
- **slog over zerolog**: master-plan specifies `slog.Logger` (stdlib, no external dependency)
- **CGO_ENABLED=0**: tonutils-go is pure Go, no C dependencies
