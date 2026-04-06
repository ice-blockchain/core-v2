# ION Connect Storage — Implementation Plan

## Context

ION Connect Storage is a virtual TON Storage protocol node that serves files cached from BNB Greenfield. It listens on ADNL/RLDP, implements TON storage RPC methods (`getTorrentInfo`, `addUpdate`, `getPiece`), and uses an LRU+TTL disk cache to avoid permanent storage bloat. Must scale to millions of bags (bag-per-file) using lazy DHT registration, CRDT-based cluster coordination, and hot/cold classification.

**Key decisions from requirements:**
- Tag key: `ion-bag-id` on Greenfield objects
- Piece size: 128KB (131,072 bytes) -- 1 Greenfield 16MB segment = 128 ION pieces
- Naming: "ION" in all internal code, third-party types keep original names
- Logging: `slog.Logger` with `LOG_LEVEL` env var
- Protocol: `tonutils-go` low-level (ADNL gateway + DHT + overlays + RLDP)
- Metadata: `.ionstorage` BoC file co-located in same bucket as data object
- greenfield-client Logger refactor bundled into Phase 2
- No `CacheMaxSize` -- TTL-only eviction
- Storage: partitioned PebbleDB (replaces BadgerDB) -- single DB instance with key prefixes for logical separation (index, metadata, CRDT blocks)
- Three-layer transport architecture:
  1. **CRDT cluster overlay** -- ownership, heartbeats, CRDT deltas, ownership queries (small messages only, control plane)
  2. **Direct ADNL peer-to-peer connections** -- piece forwarding between specific node pairs (128KB payloads, data plane). Established on demand using ADNL addresses resolved from CRDT ownership map. Keeps cluster overlay lightweight.
  3. **Lazy per-bag overlays** -- external TON Storage client compatibility. Created on demand when a client request arrives, capped at `ActiveDHTLimit` total. Not proactively created at startup or index time.
- Cluster: CRDT-based bag ownership via `go-ds-crdt` over the cluster overlay. Replaces modulus sharding.
- Provider index: IPNI-style federated index for bag discovery beyond DHT cap. Served via **HTTP-over-RLDP** on the same ADNL port (not a separate HTTP server). Clients send `GET /bags/:bagId` over RLDP to the node's ADNL address. Without this, `ActiveDHTLimit` creates a hard discoverability ceiling.
- BagId computation: done on the FE side using `@ton/core` (Cell/BoC building + cell hash), `@ton/crypto` (SHA-256), and `merkletreejs` (binary merkle tree). The FE produces the bagId hex string along with metadata (piece size, file size, header hash, description) and the merkle tree root hash, packages it into an `*.ionstorage` object, and sets the `ion-bag-id` tag on the Greenfield object at creation time. FE SDK is out of scope for this task -- E2E tests use a static file with a pre-computed constant bagId.

---

## Directory Structure

```
services/ion-connect-storage/
  cmd/main.go
  internal/
    config/
      config.go                      -- env var parsing
      config_test.go
    adnl/
      server.go                      -- ADNL gateway + DHT client lifecycle
      server_test.go
      dht_registrar.go               -- per-bag DHT register/deregister, capped by ActiveDHTLimit
      dht_registrar_test.go
      overlay_manager.go             -- lazy per-bag overlay join/leave, capped at ActiveDHTLimit, on-demand only
      overlay_manager_test.go
    index/
      subscriber.go                  -- greenfield-client.Subscribe consumer, filters for ion-bag-id tag
      subscriber_test.go
      persist.go                     -- PebbleDB persistence of last height + lazy index lookups
      persist_test.go
    greenfield/
      fetcher.go                     -- top-level Fetcher: metadata + segments
      fetcher_test.go
      segment_fetcher.go             -- download 16MB segments via Range requests (streaming)
      metadata_fetcher.go            -- download + parse .ionstorage BoC
      metadata_fetcher_test.go
      coalescer.go                   -- singleflight with bucket-qualified keys
    cache/
      segment_cache.go               -- LRU+TTL disk cache (hashicorp/golang-lru/v2/expirable)
      segment_cache_test.go
      metadata_store.go              -- PebbleDB for Merkle trees + TorrentInfo BoCs
      metadata_store_test.go
    storage/
      handler.go                     -- RPC dispatch + ensureBagLoaded (internal lazy loader)
      handler_test.go
      torrent_info.go                -- storage.getTorrentInfo
      add_update.go                  -- storage.addUpdate (bitfield exchange)
      get_piece.go                   -- storage.getPiece (hot path)
      get_piece_test.go
      piece_slicer.go                -- extract 128KB piece from 16MB segment
      piece_slicer_test.go
      merkle_proof.go                -- generate TVM cell Merkle proof branch
      merkle_proof_test.go
    boc/
      torrent_info.go                -- TorrentInfo cell build/parse
      torrent_info_test.go
      merkle_tree.go                 -- Merkle tree cell build/parse + proof generation
      merkle_tree_test.go
      torrent_header.go              -- TorrentHeader binary serialization
      torrent_header_test.go
    bagid/
      compute.go                     -- Go-side bag ID computation (128KB pieces)
      compute_test.go                -- cross-language test vectors
    cluster/
      coordinator.go                 -- CRDT-based bag ownership + content routing via go-ds-crdt
      coordinator_test.go
      adnl_broadcast.go              -- Broadcaster: sends CID head notifications over ADNL cluster overlay
      adnl_broadcast_test.go
      adnl_dag_service.go            -- DAGService over ADNL: stores IPLD blocks in PebbleDB, fetches from peers via RLDP
      adnl_dag_service_test.go
      ownership.go                   -- bag claim/release/query logic
      ownership_test.go
      piece_forwarder.go             -- forward piece requests to owning node via direct ADNL (not cluster overlay)
      piece_forwarder_test.go
    provider/
      index.go                       -- IPNI-style provider index: bagId -> serving node ADNL addresses
      index_test.go
    metrics/
      metrics.go                     -- Prometheus metric declarations
    httpserver/
      server.go                      -- Gin: health + metrics
      server_test.go
  go.mod
  go.sum
  Dockerfile
  ARCHITECTURE.md
  e2e_test.go
  benchmark_test.go

```

---

## Phase 1: ADNL Server Setup

**Goal**: Service starts, connects to TON DHT, registers own ADNL address, registers no bags. No overlays joined at startup.

### `internal/config/config.go` (~90 lines)

```go
type Config struct {
    // ADNL
    AdnlPrivateKey    string        // ADNL_PRIVATE_KEY (ed25519 hex, 64 chars)
    GlobalConfigURL   string        // GLOBAL_CONFIG_URL

    // Greenfield
    GreenfieldRpcURLs []string      // GREENFIELD_RPC_URLS (comma-separated)
    GreenfieldChainID string        // GREENFIELD_CHAIN_ID (default: greenfield_1017-1)
    GreenfieldPrivKey string        // GREENFIELD_PRIVATE_KEY
    OnlineIOEnv       string        // ONLINEIO_ENV

    // Cache
    CacheTTL          time.Duration // CACHE_TTL (default: 24h)
    CacheDir          string        // CACHE_DIR (default: /data/cache)
    DataDir           string        // DATA_DIR (default: /data/db, PebbleDB root)

    // Cluster
    ShardIndex        int           // SHARD_INDEX (default: 0, temporary until Phase 8 CRDT)
    ShardCount        int           // SHARD_COUNT (default: 1 = single node owns all)
    ClusterOverlayID  string        // CLUSTER_OVERLAY_ID (Phase 8: shared across all nodes in fleet)
    NodeID            string        // NODE_ID (Phase 8: unique per node, default: derived from ADNL key)
    ActiveDHTLimit    int           // ACTIVE_DHT_LIMIT (default: 100000)

    // HTTP
    HttpPort          string        // HTTP_PORT (default: 8080)
    MetricsPort       string        // METRICS_PORT (default: empty = colocate on HttpPort)

    // Logging
    LogLevel          string        // LOG_LEVEL (default: info)
}
```

Follow pattern from `services/greenfield-ingester/internal/config/config.go`.

### `internal/adnl/server.go` (~120 lines)

- `Server` struct wrapping `adnl.Gateway` and `dht.Client` from `tonutils-go`
- `NewServer(cfg, logger)`:
  - Use `liteclient.GetConfigFromUrl(ctx, cfg.GlobalConfigURL)` (built-in tonutils-go fetcher)
  - Decode `AdnlPrivateKey` hex to ed25519 key
  - Create `adnl.NewGateway(key)`, create `dht.NewClient(gateway, globalConfig.DHT)`
- `Start(ctx)` -- start UDP listener, connect to DHT bootstrap nodes
- `Stop(ctx)` -- close DHT, close gateway
- Zero bags registered, zero overlays joined at startup

### `internal/adnl/dht_registrar.go` (~200 lines)

Uses a **Provide Sweep** pattern (inspired by IPFS Kubo v0.39) to batch DHT updates. Instead of per-bag iterative Kademlia lookups, bags are grouped by DHT keyspace region and refreshed in bulk sweeps with connection reuse.

- `DHTRegistrar` struct:
  - `registered *lru.Cache[[32]byte, struct{}]` from `hashicorp/golang-lru/v2`, capped at `ActiveDHTLimit`
  - `sweepTicker` -- fires every `refreshInterval / regionCount` (e.g., every 2-4s for 1h TTL with ~500 regions)

- `Register(ctx, bagID)` -- add to LRU + **immediate single-bag `dht.store`** for instant discoverability. The sweep cycle handles subsequent reprovisioning. If at limit, evict LRU entry.
- `Deregister(bagID)` -- remove from LRU, stop renewing (DHT TTL handles expiry)
- `Count() int`

**Sweep cycle (background goroutine):**

1. **Partition**: sort all registered bag DHT keys (up to `ActiveDHTLimit`) into keyspace regions by bit-prefix (~8 bits, yielding ~500-1500 regions with ~7-20 DHT nodes each in TON's ~10K node network).
2. **Schedule**: spread region processing evenly across the refresh interval (1h TTL -> ~1 region every 2-4s). No registration storms.
3. **Sweep per region**:
   - ONE iterative Kademlia lookup to find the S=7 closest DHT nodes for this region
   - Open ADNL connections to those 7 nodes (or reuse from pool)
   - For every bag whose DHT key falls in this region, send `dht.store` over the same connections
   - Pool connections for reuse by adjacent regions

**Performance**: With 100K bags and ~10K DHT nodes, legacy approach requires 100K iterative lookups per refresh. Sweep requires ~500-1500 lookups (one per region) -- **65-200x reduction** in DHT lookup traffic. Total `dht.store` messages stay the same (100K x S per cycle), but connection reuse eliminates per-bag ADNL handshake overhead.

- DHT is capped at `ActiveDHTLimit`. The provider index (Phase 5) handles discovery beyond this cap.

### `internal/adnl/overlay_manager.go` (~100 lines)

- `OverlayManager` with map of active overlays, capped at `ActiveDHTLimit`
- **Never proactively created**. Overlays are joined on demand only when:
  - An external TON Storage client connects to the bag's overlay (discovered via DHT)
  - `ensureBagLoaded` is called for a bag this node owns
- `Join(ctx, bagID) error` -- idempotent. Compute overlay ID, join overlay, register RLDP query handler that dispatches `storage.*` TL messages to `storage.Handler`.
- `Leave(bagID) error` -- leave overlay, called on cache eviction
- `ActiveCount() int`
- If at `ActiveDHTLimit`, joining a new overlay evicts the LRU overlay (same cap shared with DHT registrar).

### `cmd/main.go` (~50 lines, grows per phase)

- `slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: parsedLevel}))`
- Load config, create + start ADNL server
- `signal.NotifyContext` for SIGINT/SIGTERM, 30s graceful shutdown

### Verification
- Service starts, logs DHT bootstrap node count, shuts down on SIGTERM

---

## Phase 2: Greenfield Connection + Index Building

**Goal**: Subscribe to Greenfield events, build in-memory index `bagId -> (bucketName, objectName)` from `EventSetTag` events containing `ion-bag-id` tag. Persist for restart recovery.

### greenfield-client Logger refactor (bundled here)

Add to `/workspace/packages/greenfield-client/`:
- `logger.go` -- `Logger` interface + `LogEvent` interface
- `slog_adapter.go` -- slog implementation of Logger
- `zerolog_adapter.go` -- zerolog implementation (wraps existing usage, backward compat)
- Modify `config.go`: `Logger` field changes from `zerolog.Logger` to `Logger` interface
- Update greenfield-ingester's `main.go` to use `ZerologAdapter`

### In-memory index: `xsync.Map`

No custom `index.go` file. Use `github.com/puzpuzpuz/xsync/v4` `xsync.Map[[32]byte, BagLocation]` directly -- it's a high-performance concurrent map with sharded locking, better than `sync.RWMutex` for hot read paths. Declared in the subscriber or passed as a dependency.

```go
type BagLocation struct {
    BucketName string
    ObjectName string
}

// Usage: xsync.NewMap[[32]byte, BagLocation]()
```

### `internal/index/subscriber.go` (~120 lines)

- Calls `client.Subscribe(ctx, SubscribeOpts{LastHeight: persisted, Query: query})`
- Query: `tm.event='Tx' AND greenfield.storage.EventSetTag.tags CONTAINS 'ion-bag-id'`
- For each `TxEvent`, parse `EventSetTag` events:
  - Extract `ion-bag-id` tag value (64-char hex -> `[32]byte`)
  - Parse `resource` attribute (`grn:o::<bucket>/<object>`) for bucket + object names
  - Check bag ownership via `cluster.Coordinator.OwnsOrClaim(bagID)` (CRDT-based, see Phase 8)
  - `index.Set(bagID, BagLocation{bucket, object})`
  - Persist to PebbleDB

### `internal/index/persist.go` (~80 lines)

- PebbleDB persistence: last processed height + index entries
- Key scheme: `idx/height` (last height), `idx/bag/<32-byte-bagID>` -> JSON `{bucket, object}`
- **No full rebuild on startup** -- with millions of bags, iterating all keys is too slow
- `LoadLastHeight(db) (int64, error)` -- only reads the height counter on startup
- `LookupBag(db, bagID) (BagLocation, bool, error)` -- lazy point lookup from PebbleDB when xsync.Map misses
- `PersistEntry(db, bagID, loc) error` -- single-entry write
- `PersistHeight(db, height) error`
- Flow: subscriber populates xsync.Map from live events. For bags indexed before last restart, `LookupBag` serves as the fallback when the in-memory map misses. This provides a lazy warm-up -- the map fills organically as bags are requested.

### `internal/greenfield/fetcher.go` (~80 lines)

```go
type Fetcher struct {
    client    greenfieldclient.Client
    coalescer *Coalescer
    logger    *slog.Logger
}
```

- `FetchMetadata(ctx, bucket, object) (*BagMetadata, error)` -- downloads `<object>.ionstorage`
- `FetchSegment(ctx, bucket, object, segmentIndex) (io.ReadCloser, error)` -- streaming 16MB via Range header

### `internal/greenfield/metadata_fetcher.go` (~100 lines)

- Downloads `<objectName>.ionstorage` from Greenfield
- Parses BoC using `tonutils-go`'s `cell.FromBOC()`
- Extracts TorrentInfo cell fields + Merkle tree root cell
- Returns `*BagMetadata{BagID, TorrentInfo, MerkleTreeRoot, PieceSize, FileSize, PieceCount}`

### `internal/greenfield/segment_fetcher.go` (~80 lines)

Constants: `SegmentSize = 16MB`, `PieceSize = 128KB`, `PiecesPerSegment = 128`
- `downloadSegment(ctx, bucket, object, segmentIndex) (io.ReadCloser, error)` via `GetObject` with Range
- Returns streaming reader, not full `[]byte`

### `internal/greenfield/coalescer.go` (~50 lines)

- `golang.org/x/sync/singleflight`
- Key format: `<bucket>/<object>` (metadata), `<bucket>/<object>:seg:<idx>` (segments)

### Verification
- Subscribe to Greenfield testnet, observe `ion-bag-id` tagged events being indexed
- Log index size, verify persistence across restart

---

## Phase 3: Caching Layer

**Goal**: Disk-based segment cache with TTL, PebbleDB metadata store, eviction callbacks for DHT deregistration.

### `internal/cache/segment_cache.go` (~120 lines)

Uses `hashicorp/golang-lru/v2/expirable`:

```go
type SegmentKey struct {
    BagID        [32]byte
    SegmentIndex int
}

type SegmentCache struct {
    lru     *expirable.LRU[SegmentKey, string]  // value = file path
    dir     string
    logger  *slog.Logger
    metrics *metrics.Metrics
}
```

- `Get(bagID, segmentIndex) (io.ReadCloser, bool)` -- check LRU, open file, return streaming reader
- `Put(bagID, segmentIndex, reader io.Reader) error` -- write temp file, atomic rename to `<dir>/<hex(bagID)>/<segIdx>.seg`, add to LRU
- TTL from config (`CacheTTL`, default 24h). No max size cap.
- `onEvict` callback: delete disk file, increment `cache_evictions_total`, if last segment for bag -> deregister DHT + leave overlay.
- **CRDT ownership is NOT released on cache eviction.** The node keeps its CRDT claim as long as the bag is in its PebbleDB index. If a piece request arrives for an owned-but-evicted bag, the node re-fetches the segment from Greenfield via `ensureBagLoaded`. Releasing CRDT ownership on every TTL expiry would cause millions of daily Put/Delete CRDT mutations, bloating the Merkle-DAG indefinitely (go-ds-crdt does not GC historical blocks). CRDT claims are only released on explicit `ReleaseBag` (capacity shedding or graceful shutdown).

### `internal/cache/metadata_store.go` (~100 lines)

PebbleDB-backed, keyed by bag ID:
- Key: `meta/<32-byte-bagID>`, value: raw BoC bytes
- Methods: `GetTorrentInfo`, `GetMerkleTree`, `GetBagMetadata`, `Put`, `Delete`, `Has`, `Count`
- Stores full `.ionstorage` BoC preserving Merkle tree for proof generation

### Verification
- Put/get segments, verify TTL eviction, verify disk cleanup on eviction

---

## Phase 4: RPC Storage Methods

**Goal**: Implement getTorrentInfo, addUpdate, getPiece handlers wired to per-bag overlay query dispatch. Includes piece forwarding for bags owned by other nodes.

### `internal/storage/handler.go` (~120 lines)

- `Handler` struct with refs to index, fetcher, cache, metadata store, DHT registrar, overlay manager, cluster coordinator, piece forwarder, provider index, metrics
- `HandleOverlayQuery(ctx, overlayID, query) ([]byte, error)` -- TL deserialize, route by constructor ID. Called from overlay_manager's RLDP query handler.
- `ensureBagLoaded(ctx, bagID) error` -- **private** internal method, not an RPC. Called at the start of each handler. The flow now includes piece forwarding:
  1. Check metadata store (return if present -- bag already loaded locally)
  2. Look up bagID in xsync.Map, fallback to PebbleDB point lookup
  3. If found locally: fetch `.ionstorage` from Greenfield (via coalescer), store in metadata store, register in DHT + join overlay (if under `ActiveDHTLimit`), register in provider index (always)
  4. **If NOT found locally**: query CRDT for owner -> forward to owner via direct ADNL (piece forwarder) -> owner fetches from Greenfield if needed -> response flows back. This is the inter-node forwarding path.

### `internal/storage/torrent_info.go` (~50 lines)

- `HandleGetTorrentInfo(ctx, bagID)` -- ensure available, load TorrentInfo cell, serialize as BoC, return TL `storage.torrentInfo{data}`

### `internal/storage/add_update.go` (~60 lines)

- `HandleAddUpdate(ctx, bagID, update)` -- parse update type, respond with `updateInit` full bitfield (all pieces = 1)
- Session state tracked in `sync.Map` with TTL cleanup

### `internal/storage/get_piece.go` (~120 lines, hot path)

```
1. segmentIndex = pieceID / PiecesPerSegment (128)
2. Check segment cache -> hit: read from disk -> slice piece -> return
3. Cache miss: check if this node owns the bag (CRDT / modulus)
4a. IF OWNED: look up (bucket, object) from index
    -> Fetch segment from Greenfield via coalescer (key: bucket/object:seg:idx)
    -> Cache fetched segment to disk
    -> Slice 128KB piece from segment
    -> Generate Merkle proof
    -> Return storage.piece{proof, data} in TL format
4b. IF NOT OWNED: forward to owning node via piece_forwarder
    -> Query CRDT for owner node ID -> resolve ADNL address
    -> Open direct ADNL connection to owner (not via cluster overlay)
    -> Send cluster.forwardPieceRequest{bag_id, piece_id}
    -> Receive cluster.pieceResponse{data, proof} or cluster.pieceNotFound
    -> Return forwarded response to client
```

### `internal/storage/piece_slicer.go` (~40 lines)

- `SlicePiece(segmentData []byte, pieceID int) ([]byte, error)`
- Piece offset within segment: `localIndex = pieceID % PiecesPerSegment` (i.e., `pieceID % 128`)
- Byte offset: `offset = localIndex * PieceSize` (i.e., `localIndex * 128 * 1024`)
- Read `min(PieceSize, len(segmentData) - offset)` bytes -- handles last piece being shorter
- **Explicit allocation**: `piece := make([]byte, length)` + `copy(piece, segmentData[offset:offset+length])`. Do NOT return a sub-slice of segmentData -- that pins the entire 16MB backing array in memory until the piece response is fully sent over RLDP.
- **sync.Pool for segment buffers**: use `sync.Pool` for the 16MB download buffers to avoid allocation/GC churn under concurrent fetching. Get buffer before Greenfield download, return to pool after all pieces are sliced.

### `internal/storage/merkle_proof.go` (~100 lines)

- Load Merkle tree from metadata store (cell tree in BoC format)
- Walk from leaf at `pieceID` to root, collect sibling cells
- Build pruned-branch proof (standard TVM Merkle proof format)
- Serialize as BoC

### `internal/boc/torrent_info.go` (~80 lines)

- `BuildTorrentInfoCell(pieceSize, fileSize, rootHash, headerHash, headerSize, description)` per bagId.md layout
- `ParseTorrentInfoCell(c *cell.Cell) (*TorrentInfoFields, error)`

### `internal/boc/merkle_tree.go` (~100 lines)

- `BuildMerkleTree(pieceHashes [][32]byte) (*cell.Cell, error)` -- binary tree of TVM cells
- `GenerateProof(root *cell.Cell, leafIndex, totalLeaves int) (*cell.Cell, error)`
- Uses `tonutils-go`'s `cell.Cell.Hash()` for representation hashing

### `internal/boc/torrent_header.go` (~60 lines)

- `SerializeTorrentHeader(files []FileEntry) ([]byte, [32]byte, uint64)` -- binary format matching C++ TorrentHeader

### Verification
- Mock ADNL client sends getTorrentInfo, addUpdate, getPiece
- Verify TorrentInfo BoC validity, all-ones bitfield, piece data correctness, Merkle proof validates

---

## Phase 5: HTTP Server + Metrics

### `internal/metrics/metrics.go` (~80 lines)

Custom `prometheus.Registry`:
- `bags_registered_total` (gauge)
- `bags_downloading` (gauge)
- `ion_storage_active_transfers` (gauge)
- `cache_entries_total` (gauge)
- `cache_hit_total` / `cache_miss_total` (counters)
- `cache_evictions_total` (counter)
- `greenfield_fetch_total` (counter, labels: type=segment|metadata, status=success|error)
- `greenfield_fetch_duration_seconds` (histogram, label: type)
- `index_entries_total` (gauge)

### `internal/httpserver/server.go` (~80 lines)

- Gin on `HTTP_PORT` (default 8080)
- `GET /health-check` -- 200 if Subscribe connected + ADNL up, 503 otherwise
- `GET /metrics` -- `promhttp.HandlerFor(registry)`
- If `METRICS_PORT` set and differs from `HTTP_PORT`, separate listener
- Timeouts: Read 5s, Write 10s, Idle 30s
- **Note**: provider index is NOT on this HTTP server -- it's served via HTTP-over-RLDP on the ADNL port (see below).

### `internal/provider/index.go` (~120 lines)

IPNI-style provider index. Maps bagId -> set of serving node ADNL addresses. Served via **HTTP-over-RLDP** on the same ADNL port as storage protocol traffic.

```go
type ProviderIndex struct {
    db         *pebble.DB       // key: prov/<bagID>, value: JSON array of provider records
    nodeID     string
    adnlAddr   [32]byte
    logger     *slog.Logger
}
```

- `Register(bagID)` -- add this node as a provider. Persisted in PebbleDB under `prov/<bagID>`.
- `Deregister(bagID)` -- remove this node from providers.
- `Lookup(bagID) ([]ProviderRecord, error)` -- return all known providers for a bag.
- `HandleHTTPOverRLDP(request) response` -- registered on the ADNL gateway as an HTTP-over-RLDP handler. Handles `GET /bags/:bagId` requests. Response: `{"bagId": "hex", "providers": [{"adnlAddress": "hex", "nodeId": "hex"}]}`.
- `tonutils-go` supports HTTP-over-RLDP natively -- register an `http.Handler` on the ADNL gateway. Clients send standard HTTP requests tunneled over RLDP to the node's ADNL address. No separate TCP listener needed.
- In CRDT mode (Phase 8), the provider index is populated from CRDT ownership data -- `coordinator.Owner(bagID)` maps to the owning node's ADNL address. For single-node mode (Phases 1-7), the local node registers itself for every bag it indexes.
- This breaks the DHT discoverability ceiling. DHT is capped at `ActiveDHTLimit` bags, but the provider index serves lookups for all bags with O(1) PebbleDB reads.

### Instrumentation
- Cache: hit/miss/eviction counters on Get/Put/Evict
- Greenfield fetcher: `prometheus.Timer` + status counter per fetch
- Handler: active_transfers gauge around getPiece
- Index: index_entries_total on Set/Delete
- Metadata store: bags_registered_total = store.Count()
- Provider index: provider_lookups_total (counter), provider_registrations_total (gauge)

### Verification
- `curl :8080/health-check` returns 200
- `curl :8080/metrics` returns all declared metrics

---

## Phase 6: E2E Test

### `services/ion-connect-storage/e2e_test.go` (~200 lines, `//go:build e2e`)

Follows the pattern from `services/greenfield-ingester/internal/ingester/e2e_test.go` -- uses pre-populated test fixtures on Greenfield testnet rather than uploading during the test.

Env: `GREENFIELD_E2E_PRIVATE_KEY`, `ADNL_PRIVATE_KEY`, `GLOBAL_CONFIG_URL`

**Test setup (runs at start of test):**
- A static test file with known deterministic content is pre-uploaded on Greenfield testnet
- Pre-computed `ion-bag-id` tag already set on the object
- The test **builds the `.ionstorage` BoC from the file** using `internal/bagid` and `internal/boc` packages:
  1. Download the static file from Greenfield
  2. Hash all 128KB pieces, build Merkle tree, build TorrentInfo cell
  3. Verify computed bag ID matches the `ion-bag-id` tag on the object
  4. Serialize TorrentInfo + Merkle tree as BoC
  5. Upload `<objectName>.ionstorage` to Greenfield
- Reference: `tonutils-storage` (Go) can be used as a **test-only** dependency to cross-validate BoC format and Merkle proof correctness. Do NOT use it in production code.

Flow:
1. Run test setup (build + upload .ionstorage from static file)
2. Start ion-connect-storage in-process with test config
3. Wait for health endpoint 200 + index to populate via Subscribe (picks up pre-tagged object)
4. Resolve bag via DHT, join per-bag overlay
5. Call `getTorrentInfo` via overlay, verify BoC is valid and bag ID matches expected
6. Call `addUpdate`, verify bitfield response (all pieces available)
7. Call `getPiece` for each piece via overlay, verify Merkle proofs
8. Reassemble pieces, assert content matches known test file hash
9. Also test provider index path: send `GET /bags/:bagId` via HTTP-over-RLDP to node's ADNL address, verify provider records returned

### `internal/bagid/compute.go` (~100 lines)

Go-side bag ID computation (used by tests and for verification):
- `Compute(content, fileName, description) (string, error)`
- `HashPieces(data) [][]byte`
- `BuildMerkleTree(pieceHashes) (*cell.Cell, error)`
- `BuildTorrentInfoCell(opts) (*cell.Cell, error)`

---

## Phase 7: Benchmark / Load Test

### `services/ion-connect-storage/benchmark_test.go` (~200 lines, `//go:build benchmark`)

### `internal/testutil/mock_greenfield.go` (~80 lines)
In-process HTTP server returning synthetic segments with configurable latency.

### Scenarios
1. **Hot cache** -- all bags pre-cached, 100 concurrent clients, 1000 req/client. Baseline latency.
2. **Cold start** -- empty cache, all requests trigger mock Greenfield fetch. Worst-case latency.
3. **Mixed (80/20)** -- Zipf distribution. Realistic workload.
4. **Thundering herd** -- 100 clients request same uncached bag. Verify single Greenfield fetch (singleflight).
5. **Index stress** -- 1M index entries in xsync.Map + PebbleDB, measure lookup latency and memory.
6. **Cold lookup** -- request bags not in xsync.Map, verify lazy PebbleDB fallback latency.
7. **Provider index** -- 1M bag lookups via HTTP `/bags/:bagId`, measure p99 latency.

### Measurements
- Cache hit ratio, avg/p95/p99 piece latency, Greenfield fetch latency
- Peak memory (`runtime.ReadMemStats`), requests/sec

---

## Phase 8: CRDT Cluster Management

**Goal**: Replace static modulus-based sharding with dynamic CRDT-based bag ownership and content routing. Nodes self-organize using `go-ds-crdt` over a single dedicated ADNL cluster overlay. Only bag ownership is replicated -- cache state stays local.

### Architecture

Three transport layers, each with distinct traffic profiles:

```
1. CRDT Cluster Overlay (control plane)
   Node A ──┐
   Node B ──┤── ownership, heartbeats, CRDT deltas, IPLD blocks (small messages)
   Node C ──┘

2. Direct ADNL Peer-to-Peer (data plane)
   Node A ───── Node B    (piece forwarding, 128KB payloads, on-demand connections)

3. Lazy Per-Bag Overlays (client compatibility)
   Client ──── Overlay(bagID) ──── Node A    (standard TON Storage protocol)
```

The cluster overlay (identified by `CLUSTER_OVERLAY_ID`) stays lightweight -- only CRDT gossip and IPLD block exchange. Piece data (128KB) flows over **direct ADNL connections** between specific node pairs, established on demand using ADNL addresses from the CRDT ownership map. This separation prevents data-plane traffic from degrading CRDT convergence. At low forwarding rates mixing would be fine, but at thousands of forwarded pieces/sec the cluster overlay would become a bottleneck.

Each node maintains a local `go-ds-crdt` datastore backed by PebbleDB (via a `ds.Datastore` adapter). The CRDT type is an OR-Set (Observed-Remove Set) where each entry is `(bagID, nodeID)` -- meaning "nodeID claims ownership of bagID". When a node indexes a new bag from Greenfield Subscribe, it adds a claim. When a bag is evicted from cache, the claim is removed. CRDT convergence ensures all nodes eventually agree on who owns which bags.

### `internal/cluster/adnl_broadcast.go` (~80 lines)

Implements `go-ds-crdt`'s `Broadcaster` interface. The Broadcaster only sends lightweight **CID head notifications** -- it does NOT transfer full CRDT deltas. When a peer receives a head CID, it uses the DAGService to fetch the actual Merkle-DAG blocks.

```go
type ADNLBroadcaster struct {
    overlay  *overlay.Overlay  // single cluster overlay
    incoming chan []byte        // received head CIDs from peers
    logger   *slog.Logger
}

// Broadcast sends a head CID notification to all peers via overlay.Broadcast().
func (b *ADNLBroadcaster) Broadcast(ctx context.Context, data []byte) error

// Next blocks until the next head CID arrives or ctx is cancelled.
// go-ds-crdt cancels this context during Datastore.Close() — must select on ctx.Done().
func (b *ADNLBroadcaster) Next(ctx context.Context) ([]byte, error)
```

- Custom TL constructor ID for CRDT head notifications (distinct from storage protocol messages)
- Overlay query handler routes incoming CRDT messages to the `incoming` channel

### `internal/cluster/adnl_dag_service.go` (~150 lines)

Implements `ipld.DAGService` interface over ADNL -- this is essentially Bitswap-over-ADNL. Required by `go-ds-crdt` to fetch full Merkle-DAG deltas when a peer announces a new head CID.

```go
type ADNLDAGService struct {
    localStore *pebble.DB        // IPLD blocks stored locally by CID
    overlay    *overlay.Overlay  // cluster overlay for remote fetching
    logger     *slog.Logger
}
```

**Interface methods:**

- `Get(ctx, cid.Cid) (ipld.Node, error)` -- check local PebbleDB first. On miss, fan out to `min(3, len(peers))` overlay peers via RLDP, first response wins, cancel rest. Decode raw bytes to `dag.ProtoNode` via `dag.DecodeProtobufBlock(blocks.NewBlock(rawData))`. Cache result locally.
- `GetMany(ctx, []cid.Cid) <-chan *ipld.NodeOption` -- bounded-parallelism fan-out over `Get()` (concurrency limit: 8)
- `Add(ctx, ipld.Node) error` -- store `node.RawData()` in PebbleDB keyed by `block:<cid-bytes>`. go-ds-crdt creates DAG nodes using `dag.ProtoNode` from `github.com/ipfs/boxo/ipld/merkledag` with `cid.DagProtobuf` codec.
- `AddMany(ctx, []ipld.Node) error` -- batch `Add()` in a PebbleDB write batch
- `Remove(ctx, cid.Cid) error` -- delete from PebbleDB
- `RemoveMany(ctx, []cid.Cid) error` -- batch delete

**ADNL block exchange protocol (custom TL):**

```
// Request: fetch IPLD block by CID
cluster.getBlock cid:bytes = cluster.Block;
// Response: block data or not-found
cluster.block data:bytes = cluster.Block;
cluster.blockNotFound = cluster.Block;
```

- The overlay query handler dispatches `cluster.getBlock` requests to `localStore.Get()`
- `Get()` fan-out bounded to 3 peers max -- sufficient for redundancy since blocks are immutable (content-addressed). Without bounds, catching up on 100 missed mutations across a 50-node overlay would generate 5,000 RLDP queries.
- Blocks are immutable, so caching is safe and permanent

**Serialization detail**: go-ds-crdt uses `dag.ProtoNode` (protobuf-encoded IPLD nodes) internally. `Add()` stores `node.RawData()` (raw protobuf bytes). `Get()` must reconstruct via `dag.DecodeProtobufBlock()` to produce a valid `ipld.Node` with correct links for DAG traversal. Getting the CID codec/multihash prefix wrong will cause go-ds-crdt to fail silently during DAG sync.

**Why this works at scale**: go-ds-crdt's DAG stores CRDT operation logs, not bag content. Each ownership mutation creates one small IPLD node (~100-500 bytes). Even with millions of bags, the DAG size is bounded by the number of ownership changes, not the number of bags. Block exchange volume is negligible compared to content-serving traffic.

**Dependencies**: `github.com/ipfs/boxo/ipld/merkledag` (for `dag.DecodeProtobufBlock`), `github.com/ipfs/go-block-format` (for `blocks.NewBlock`)

### `internal/cluster/coordinator.go` (~150 lines)

Central coordination logic:

```go
type Coordinator struct {
    crdt        *crdt.Datastore
    broadcaster *ADNLBroadcaster
    dagService  *ADNLDAGService
    nodeID      string
    logger      *slog.Logger
}
```

- `NewCoordinator(cfg, adnlServer, logger)`:
  - **Join cluster overlay on startup** using `CLUSTER_OVERLAY_ID` -- this is the single shared overlay all fleet nodes join immediately (unlike per-bag overlays which are lazy)
  - Create PebbleDB-backed `ds.Datastore` adapter for CRDT state persistence (key prefix: `crdt/`)
  - Create `ADNLBroadcaster` wrapping the overlay (head CID notifications)
  - Create `ADNLDAGService` wrapping the overlay + local PebbleDB (block exchange, key prefix: `block/`)
  - Initialize with correct signature: `crdt.New(pebbleDS, ds.NewKey("/ion-cluster"), dagService, broadcaster, &crdt.Options{...})`
- `Start(ctx)` -- begins CRDT sync, starts heartbeat writer (every 60s)
- `Stop()` -- leaves cluster overlay, closes CRDT, closes DAGService

**Startup sequence in `cmd/main.go`**: After ADNL server starts, create and start Coordinator immediately. The cluster overlay is joined before Subscribe begins, ensuring bag ownership decisions are CRDT-coordinated from the first event.

### `internal/cluster/ownership.go` (~100 lines)

Bag ownership query and management:

```go
// ClaimBag adds this node's ownership claim for a bag.
// CRDT OR-Set ensures concurrent claims from multiple nodes are all recorded.
func (c *Coordinator) ClaimBag(ctx context.Context, bagID [32]byte) error

// ReleaseBag removes this node's ownership claim.
func (c *Coordinator) ReleaseBag(ctx context.Context, bagID [32]byte) error

// OwnsBag checks if this node currently owns a bag.
func (c *Coordinator) OwnsBag(bagID [32]byte) bool

// OwnsOrClaim checks ownership; if unclaimed by any node, claims it for this node.
// Used by the index subscriber when discovering new bags.
func (c *Coordinator) OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error)

// Owner returns the node ID that owns a bag, or empty if unclaimed.
func (c *Coordinator) Owner(bagID [32]byte) string

// OwnedCount returns number of bags this node owns.
func (c *Coordinator) OwnedCount() int
```

Key design:
- CRDT key format: `own/<hex-bagID>` -> value: `<nodeID>`
- Conflict resolution uses **CRDT-native determinism** (not application-level tiebreaking). When two nodes write to the same key concurrently, `go-ds-crdt` converges to a single winner based on internal Merkle-DAG block priority. The winner is deterministic across all replicas but not predictable from nodeID ordering.
- When a node goes down, its claims persist in the CRDT until a reclamation goroutine explicitly removes them.

### Conflict resolution

```
1. Bag discovered by Subscribe on Node A and Node B simultaneously
2. Both call OwnsOrClaim(bagID)
3. Both write Put("own/<bagID>", "nodeA") and Put("own/<bagID>", "nodeB")
4. CRDT deltas propagate via cluster overlay (head CIDs via Broadcaster, blocks via DAGService)
5. go-ds-crdt converges to a single value (deterministic, implementation-defined by DAG block priority)
6. Each node reads Get("own/<bagID>") -- if value != myNodeID, drop the bag from index
```

No application-level tiebreaker needed. The CRDT guarantee is that all replicas converge to the same value -- which value wins is irrelevant for correctness.

### `internal/cluster/piece_forwarder.go` (~120 lines)

Forwards piece requests to the owning node via **direct ADNL peer-to-peer connections** (NOT the cluster overlay).

```go
type PieceForwarder struct {
    gateway    *adnl.Gateway       // for opening direct ADNL connections
    coordinator *Coordinator       // to resolve bagID -> owner nodeID -> ADNL address
    connPool   *ADNLConnPool       // reusable direct ADNL connections to peers
    logger     *slog.Logger
}
```

**TL protocol (custom, over direct ADNL/RLDP):**

```
cluster.forwardPieceRequest bag_id:int256 piece_id:int = cluster.PieceResponse;
cluster.pieceResponse data:bytes proof:bytes = cluster.PieceResponse;
cluster.pieceNotFound = cluster.PieceResponse;
```

- `ForwardGetPiece(ctx, bagID, pieceID) (data []byte, proof []byte, error)`:
  1. `coordinator.Owner(bagID)` -> ownerNodeID
  2. Resolve ownerNodeID -> `{adnlAddr, ip, port}` from CRDT key `nodeinfo/<nodeID>` (no DHT lookup needed -- instant resolution, avoids multi-second latency on first forward)
  3. Open direct ADNL connection to owner using IP:port (or reuse from pool)
  4. Send `cluster.forwardPieceRequest{bag_id, piece_id}` via RLDP
  5. Receive `cluster.pieceResponse` or `cluster.pieceNotFound`
  6. Return to caller

- **Connection pool** (`ADNLConnPool`): maintains a small pool of reusable ADNL connections to peer nodes (keyed by ADNL address). Connections are opened on first forward, kept alive with idle timeout (5min), closed on eviction. Pool size bounded per-peer (1-3 connections).

- **On the receiving side**: the ADNL gateway registers a handler for `cluster.forwardPieceRequest` TL constructor. The handler calls the local `storage.Handler.HandleGetPiece()` (same code path as serving a client) and wraps the result in `cluster.pieceResponse`.

- **Why direct ADNL, not cluster overlay**: the cluster overlay is designed for 10-50 nodes exchanging small CRDT deltas. Routing 128KB piece payloads through it mixes control-plane and data-plane traffic. At high forwarding volume (thousands/sec), overlay gossip would degrade. Direct ADNL is point-to-point, no relay, no broadcast overhead.

### Dead node detection + reclamation

- Each node writes `heartbeat/<nodeID> = <unix-timestamp>` every 60s
- Each node stores routing info in CRDT: `nodeinfo/<nodeID>` -> JSON `{adnlAddr, ip, port}` (updated on startup and IP change). This enables instant peer dialing for piece forwarding without DHT lookups.
- **Reclamation goroutine** in `coordinator.go` runs every 5min:
  1. Scan all `heartbeat/*` keys, build set of dead nodeIDs (heartbeat >10min stale)
  2. **Responsibility ring**: only the active node whose nodeID is closest (XOR distance) to the dead node's ID executes the reclamation scan. All other nodes skip. This prevents a thundering herd where all nodes simultaneously detect the stale heartbeat, scan `own/*` keys, and fire off concurrent CRDT mutations that choke the control plane.
  3. The responsible node prefix-queries `own/*` keys, filters for dead nodeID values, `Delete`s stale entries, then `Put`s own nodeID to claim them.
  4. Before claiming each bag, check if another active node has already claimed it (early abort to avoid redundant mutations).
  5. Log reclamation count.
- This goroutine pushes `coordinator.go` to ~200 lines

### Config additions

```go
// Added to Config struct
ClusterOverlayID  string  // CLUSTER_OVERLAY_ID (hex, shared across fleet)
NodeID            string  // NODE_ID (default: hex(ADNL public key))
```

### New metrics

- `cluster_nodes_active` (gauge) -- number of nodes with fresh heartbeats
- `cluster_bags_owned` (gauge) -- bags owned by this node
- `cluster_crdt_deltas_sent` / `cluster_crdt_deltas_received` (counters)
- `cluster_conflicts_resolved` (counter) -- tiebreaker invocations
- `cluster_piece_forwards_total` (counter, labels: direction=sent|received) -- inter-node piece forwarding
- `cluster_piece_forward_duration_seconds` (histogram) -- forwarding latency (includes remote Greenfield fetch if cache miss on owner)
- `cluster_active_peer_connections` (gauge) -- direct ADNL connections in the pool

### Integration points

- **Index subscriber** (Phase 2): calls `coordinator.OwnsOrClaim(bagID)` instead of modulus check. If not owned, skip indexing.
- **Cache eviction** (Phase 3): calls `overlayManager.Leave(bagID)` and `dhtRegistrar.Deregister(bagID)` on last segment eviction. Does **NOT** call `coordinator.ReleaseBag()` -- ownership persists as long as the bag is indexed in PebbleDB. The node re-fetches from Greenfield on next request.
- **ensureBagLoaded** (Phase 4): if bag is owned locally, load metadata + join overlay + register DHT. If not owned, forward via `pieceForwarder` to the owning node.
- **get_piece** (Phase 4): local-owned path serves directly. Non-owned path forwards via `pieceForwarder.ForwardGetPiece()` over direct ADNL.
- **Provider index** (Phase 5): in CRDT mode, derived from CRDT ownership -- `Lookup(bagID)` queries `coordinator.Owner(bagID)` to resolve the owning node's ADNL address.
- **Health check** (Phase 5): includes cluster overlay connectivity + active overlay count.

### Verification
- Start 3 nodes with same `CLUSTER_OVERLAY_ID`, verify CRDT convergence
- Kill one node, verify its bags are reclaimed by remaining nodes within heartbeat timeout
- Simulate concurrent bag claims, verify deterministic tiebreaker resolves correctly
- Verify bag eviction triggers ownership release and availability for other nodes
- **Piece forwarding**: request a bag from Node A that is owned by Node B. Verify Node A forwards to Node B via direct ADNL, Node B fetches from Greenfield, response flows back to client through Node A.
- Verify piece forwarding uses direct ADNL connections (not cluster overlay) -- inspect `cluster_active_peer_connections` metric

---

## Build Order

```
Phase 1 (ADNL server)
  -> Phase 2 (Greenfield + index)
    -> Phase 3 (Cache layer)
      -> Phase 4 (RPC methods)
        -> Phase 5 (HTTP + metrics)
          -> Phase 6 (E2E) -> Phase 7 (Benchmark)
        Phase 8 (CRDT cluster) -- can start after Phase 4
```

Phase 8 integrates into Phases 2-5 via the `Coordinator` interface.

**Note**: Phases 1-4 use modulus-based sharding as a temporary `Coordinator` implementation (`bagID_as_uint64 % SHARD_COUNT == SHARD_INDEX`). Config includes `SHARD_INDEX` (default: 0) and `SHARD_COUNT` (default: 1, meaning single node owns all bags). Phase 8 replaces this with the real CRDT implementation. The `Coordinator` interface stays the same -- only the backing implementation changes.

---

## Key Dependencies

| Dependency | Purpose |
|---|---|
| `github.com/xssnick/tonutils-go` | ADNL gateway, DHT, RLDP, overlay, TVM cells (low-level) |
| `packages/greenfield-client` (enhanced with Logger interface) | Greenfield Subscribe + object download |
| `github.com/cockroachdb/pebble` | On-disk KV for index persistence + Merkle tree metadata + CRDT backing store. Partitioned via key prefixes (`idx/`, `meta/`, `crdt/`, `prov/`, `block/`). |
| `github.com/ipfs/go-ds-crdt` | CRDT datastore for distributed bag ownership |
| `github.com/ipfs/go-ipld-format` | DAGService interface (ipld.Node, ipld.DAGService) |
| `github.com/ipfs/go-datastore` | ds.Datastore interface required by go-ds-crdt. Needs a thin PebbleDB adapter implementing `ds.Batching` (Get/Put/Delete/Has/Query/Batch). |
| `github.com/ipfs/boxo/ipld/merkledag` | dag.DecodeProtobufBlock for IPLD node deserialization |
| `github.com/ipfs/go-block-format` | blocks.NewBlock for wrapping raw bytes as IPLD blocks |
| `github.com/puzpuzpuz/xsync/v4` | High-performance concurrent map for bag index |
| `github.com/hashicorp/golang-lru/v2` | LRU+TTL cache index (expirable variant) |
| `golang.org/x/sync/singleflight` | Request coalescing |
| `github.com/gin-gonic/gin` | HTTP health/metrics server |
| `github.com/prometheus/client_golang` | Prometheus metrics |

---

## Verification Summary

| Phase | Check |
|---|---|
| 1 | Starts, connects DHT, logs bootstrap count, shuts down cleanly |
| 2 | Indexes `ion-bag-id` tagged events, lazy PebbleDB lookups work |
| 3 | TTL eviction works, disk files cleaned, LRU ordering correct |
| 4 | getTorrentInfo/addUpdate/getPiece return valid TL responses with correct Merkle proofs |
| 5 | `/health-check` 200 (HTTP/localhost), `/metrics` returns all metrics, `/bags/:bagId` returns provider records (HTTP-over-RLDP on ADNL port) |
| 6 | Full roundtrip: pre-populated fixture -> index -> overlay-based ADNL download with proof verification |
| 7 | All benchmark scenarios complete, singleflight verified |
| 8 | 3-node cluster converges, piece forwarding via direct ADNL works, dead node reclamation works |
