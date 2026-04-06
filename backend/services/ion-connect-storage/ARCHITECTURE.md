# ION Connect Storage -- Architecture

## Purpose

Virtual TON Storage protocol node that serves files cached from BNB Greenfield. Listens on ADNL/RLDP, implements TON storage RPC methods, and uses an LRU+TTL disk cache. Designed to scale to millions of bags using lazy DHT registration, CRDT-based cluster coordination, and hot/cold classification.

## Current State: Phase 8 (CRDT Cluster Management)

Phases 1-5 complete (ADNL server, Greenfield indexing, caching layer, TON Storage RPC, HTTP/metrics/provider index, E2E tests). Phase 8 adds:
- **CRDT-based bag ownership** via `go-ds-crdt` over a dedicated ADNL cluster overlay
- **Three-layer transport**: CRDT cluster overlay (control plane), direct ADNL peer-to-peer (data plane for piece forwarding), lazy per-bag overlays (client compatibility)
- **PebbleDB-backed CRDT datastore** adapter implementing `ds.Batching` (key prefix `crdt/`)
- **ADNL Broadcaster** sending CID head notifications over the cluster overlay
- **ADNL DAGService** for IPLD block exchange (local PebbleDB + remote fan-out via RLDP)
- **Ownership management**: claim/release/query via dual-key CRDT format (`own/<bagID>` for lookup + `bynode/<nodeID>/<bagID>` for enumeration)
- **Dead node reclamation**: heartbeat monitoring + XOR-closest responsibility ring to prevent thundering herd
- **Piece forwarding**: non-owning nodes forward piece requests to owners via direct ADNL connections (not cluster overlay)
- **SingleNodeCoordinator**: implements all cluster interfaces for non-cluster mode (backward compatible)
- Health HTTP server, Prometheus metrics, provider index, RLDP-HTTP bridge (from Phase 5)
- Two separate Gin engines: public (provider index over RLDP) and private (health + metrics over TCP)

## .ionstorage Format (v2)

The `.ionstorage` companion object on Greenfield stores the TorrentInfo BoC, the full merkle tree, and the serialized torrent header:

```
[1 byte: version = 0x02]
[4 bytes LE: TorrentInfo BoC length][TorrentInfo BoC bytes]
[4 bytes LE: merkle tree BoC length][merkle tree BoC bytes]
[serialized torrent header bytes (TL-boxed)]
```

- **TorrentInfo BoC**: Standard TVM cell (compatible with tonutils-storage). Layout: `pieceSize(32) | fileSize(64) | rootHash(256) | headerSize(64) | headerHash(256) | description(8)`. Description is stored inline (not as reference). BagID = `SHA256(CellRepr(torrentInfoCell))`.
- **Merkle tree BoC**: Full binary merkle tree of piece hashes. Stored to enable O(log N) proof generation without re-hashing pieces at runtime.
- **Torrent header**: TL-boxed binary format (`torrent_header#9128aab7`). Contains file names, sizes, and directory structure.
- **FileSize**: `headerSize + dataSize` (total). Pieces are hashed over `headerBytes + payload`, matching tonutils-storage's `CreateTorrent` format exactly.
- **headerHash**: `SHA256(serializedTorrentHeader)`. headerSize = length of serialized header bytes.
- **Greenfield stores payload only**: the raw file data. Header bytes are embedded in `.ionstorage`. When serving pieces, the handler prepends header bytes before payload data.

## Piece Serving: Header Prepending

TON Storage pieces cover `headerBytes + payload`. Greenfield stores only the raw payload. When `getPiece` is called:

```
Piece byte range:    [pieceStart, pieceEnd)
Header byte range:   [0, headerSize)
Payload byte range:  [headerSize, fileSize)

Case 1: pieceEnd <= headerSize     -> piece is entirely header data (from metadata)
Case 2: pieceStart >= headerSize   -> piece is entirely payload (from segment cache / Greenfield)
Case 3: spans boundary             -> concat tail of header + head of payload
```

The piece slicer (`internal/storage/piece_slicer.go`) handles all three cases with explicit copies to avoid pinning 16MB segment backing arrays.

## Data Structures

### Config (`internal/config/config.go`)
- `Config` struct parsed from environment variables
- Required: `ADNL_PRIVATE_KEY`, `PORT`, `ADNL_EXTERNAL_ADDR`, `GLOBAL_CONFIG_URL`, `GREENFIELD_RPC_URLS`, `GREENFIELD_PRIVATE_KEY`, `ONLINEIO_ENV`
- Defaults: `CACHE_TTL=24h`, `CACHE_DIR=/data/cache`, `ACTIVE_DHT_LIMIT=100000`, `HTTP_PORT=8080`, `DATA_DIR=/data/db`

### Server (`internal/adnl/server.go`)
- Wraps `adnl.Gateway` (UDP transport) and `dht.Client` (Kademlia DHT)
- Owns `DHTRegistrar` and `OverlayManager`
- Binds on `0.0.0.0:PORT`, advertises `ADNL_EXTERNAL_ADDR` in DHT
- `Start`: binds UDP (single listener thread), sets external address list, registers self in DHT, starts sweep goroutine, registers ADNL connection handler for RLDP overlay dispatch
- `Stop`: stops registrar, closes DHT client, closes gateway
- `PrivateKey()`: accessor for overlay node signing and storage handler

### Connection Handler (`internal/adnl/connection_handler.go`)
- Registered via `gateway.SetConnectionHandler` in `Start`
- For each incoming ADNL peer: wraps with `overlay.CreateExtendedADNL` + `overlay.CreateExtendedRLDP`
- Three handler layers on the same RLDP client:
  - `extADNL.SetQueryHandler`: non-overlay ADNL queries (GetCapabilities response)
  - `rl.SetOnUnknownOverlayQuery`: overlay-wrapped RLDP queries (storage protocol)
  - `rl.SetOnQuery` (rootQueryHandler): non-overlay RLDP queries (HTTP-over-RLDP for provider index)
- Routes overlay-wrapped ADNL queries to `OverlayManager.HandleIncomingQuery`
- Routes overlay-wrapped RLDP queries (large payloads like pieces) to the same handler via `SendAnswer`
- Routes non-overlay RLDP queries to `RLDPHTTPBridge` for HTTP-over-RLDP processing
- Detects Ping messages (constructor `0x44f3f211`) and triggers bidirectional session initialization via `OverlayManager.NotifyNewSession`

### Overlay ID (`internal/adnl/overlay_id.go`)
- `ComputeOverlayID(bagID)`: derives overlay ID as `tl.Hash(keys.PublicKeyOverlay{Key: bagID})`, matching tonutils-storage's convention

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
- LRU cache capped at `ActiveDHTLimit`, mapping `overlayID -> bagID` (key = `ComputeOverlayID(bagID)`, value = `bagID`). Incoming overlay queries carry overlayID; handlers need bagID.
- `SetQueryHandler`: registers the storage handler for incoming queries
- `SetSessionCallback`: registers callback for bidirectional session init (Ping detection)
- `HandleIncomingQuery`: validates overlay is active, resolves bagID, delegates to query handler
- `NotifyNewSession`: triggers session callback with RLDP connection for reverse UpdateInit

### Handler (`internal/storage/handler.go`)
- Central RPC dispatch. Holds refs to `MetadataStore`, `SegmentCache`, `Fetcher`, `Persister`, ADNL private key.
- `HandleOverlayQuery(ctx, bagID, rawQuery)`: reads TL constructor ID, dispatches to specific handler
- `ensureBagLoaded(ctx, bagID)`: lazy metadata loader. Checks MetadataStore (PebbleDB hit or Greenfield fetch-on-miss). Single entry point for all handlers.
- Supported constructors: `getTorrentInfo`, `getPiece`, `addUpdate`, `ping`, `getRandomPeers`

### TL Schema (`internal/storage/tl_schema.go`)
- TL constructor IDs as constants (verified via `tl.CRC` against tonutils-storage definitions)
- Manual TL serialization/deserialization helpers -- no `tl.Register` to avoid global registry conflicts with tonutils-storage in tests
- `serializeTorrentInfoResponse`, `serializePieceResponse`, `serializeOkResponse`, `serializePongResponse`
- `buildFullBitfield(pieceCount)`: all-ones bitfield for UpdateInit
- `appendTLBytes`: TL bytes wire format (length prefix + padding)

### GetTorrentInfo (`internal/storage/torrent_info.go`)
- Extracts TorrentInfo BoC section from v2 `.ionstorage` raw bytes (skip version byte + read length-prefixed BoC)
- Returns `storage.torrentInfo { data: bocBytes }`

### AddUpdate (`internal/storage/add_update.go`)
- Responds with `storage.ok` to incoming AddUpdate requests
- The seeder's own UpdateInit (bitfield) is sent as a separate bidirectional message via `SessionInitiator`

### GetPiece (`internal/storage/get_piece.go`)
- Hot path. Loads metadata, determines piece boundaries (header/payload/boundary), assembles piece data
- Fetches payload segments from cache or Greenfield (with TeeReader to cache on miss)
- Generates TVM MerkleProof exotic cell via `boc.GenerateMerkleProof`
- Returns `storage.piece { proof: bocBytes, data: pieceBytes }`
- `sync.Pool` for 16MB segment buffers to reduce GC churn

### Piece Slicer (`internal/storage/piece_slicer.go`)
- `slicePieceData`: extracts piece bytes from header and/or segment data, handling all three boundary cases
- Explicit `copy` for payload slices to avoid pinning 16MB backing arrays
- `payloadSegmentIndex`: computes which Greenfield segment contains data for a given piece

### GetRandomPeers (`internal/storage/random_peers.go`)
- Returns this node as sole peer via `overlay.NewNode(bagID, privateKey)`
- Phase 4 single-node mode: always returns self. Phase 8 will query CRDT for bag owner.
- Uses `tl.Serialize(overlay.NodesList{})` -- overlay types are registered by tonutils-go, no conflict

### Session Initiator (`internal/storage/session_initiator.go`)
- Sends the seeder's `AddUpdate(UpdateInit)` bitfield back to the downloader
- Triggered by `OverlayManager.NotifyNewSession` when a Ping is detected from a new session
- Tracks initiated sessions by `(bagID, sessionID)` to avoid duplicates
- Sends via RLDP `DoQuery` with manually serialized overlay-wrapped AddUpdate payload

### BagMetadata (`internal/boc/bag_metadata.go`)
- Parsed from `.ionstorage` v2 format (version byte + TorrentInfo BoC + merkle tree BoC + header)
- Fields: BagID, PieceSize, FileSize, HeaderSize, HeaderHash, RootHash, PieceCount, MerkleTree (*cell.Cell), Header (*TorrentHeader), RawBoC
- `ParseIonStorageBoC`: reads version byte (must be 0x02), parses TorrentInfo section, merkle tree section, trailing header bytes
- `BuildIonStorageBytes(torrentInfoBoC, merkleTreeBoC, headerBytes)`: constructs v2 format

### Merkle Tree (`internal/boc/merkle_tree.go`)
- `BuildMerkleTree(hashes)`: binary tree of TVM cells, padded to next power of 2 with zero-hash cells. Uses `cell.FromRawUnsafe` for exact tonutils-storage compatibility.
- `ComputePieceHashes(data, pieceSize)`: SHA256 hash per piece
- `GenerateMerkleProof(tree, leafIndex, totalLeaves)`: builds a TVM MerkleProof exotic cell using `cell.CreateProof` with a `ProofSkeleton` tracing root-to-leaf path. Passes `cell.CheckProof(proof, rootHash)` verification.

### TorrentHeader (`internal/boc/torrent_header.go`)
- Parsed from TL-boxed binary format (`torrent_header#9128aab7`)
- Wire format (little-endian): `TL_ID(4) | FilesCount(4) | TotalNameSize(8) | TotalDataSize(8) | FEC_ID(4) | DirNameSize(4) | DirName | NameIndex[] | DataIndex[] | Names`
- Compatibility with tonutils-storage verified by `compatibility_test.go`

### Testing Helpers (`internal/boc/testing_helpers.go`)
- `BuildIonStorageBoC(payload, pieceSize, header)`: constructs v2 `.ionstorage`. Hashes pieces over `headerBytes + payload` (matching tonutils-storage). Greenfield stores only raw payload.
- `BuildTorrentInfoCell`: builds standard TorrentInfo TVM cell
- `SingleFileHeader(name, size)`: convenience for single-file torrent headers

### MetadataStore (`internal/cache/metadata_store.go`)
- PebbleDB-backed metadata cache with Greenfield fetch-on-miss
- Key scheme: `meta/<32-byte-bagID>` (raw .ionstorage bytes), disjoint from `idx/` prefix
- Single entry point for metadata -- all Phase 4 handlers call this

### SegmentCache (`internal/cache/segment_cache.go`)
- Per-file disk cache with TTL eviction via `hashicorp/golang-lru/v2/expirable`
- Cache structure: `<cacheDir>/<hex(bagID)>/<fileName>`
- Eviction callback: `os.RemoveAll(bagDir)`, deregister DHT + leave overlay

### Persister (`internal/index/persist.go`)
- Two-tier bag index: in-memory `xsync.Map` + PebbleDB
- Key scheme: `idx/height`, `idx/bag/<32-byte-bagID>`

### Subscriber (`internal/index/subscriber.go`)
- Consumes Greenfield blockchain events, correlates SetTag with CreateObject, persists bag index

### Fetcher (`internal/greenfield/fetcher.go`)
- Downloads `.ionstorage` metadata and 16MB segments from Greenfield
- singleflight coalescing, TeeReader streaming to cache

### TL HTTP Types (`internal/adnl/tl_http.go`)
- TON HTTP-over-RLDP protocol types: `Request`, `Response`, `Header`, `GetNextPayloadPart`, `PayloadPart`, `GetCapabilities`, `Capabilities`
- Registered via `tl.Register()` in `init()` with standard TON TL schemas
- Not built into tonutils-go -- defined locally

### RLDP-HTTP Bridge (`internal/adnl/rldp_http.go`)
- `RLDPHTTPBridge`: converts HTTP-over-RLDP requests to `http.Request`, routes through a `gin.Engine` via `ServeHTTP`, serializes response back to TL Response + PayloadPart
- Two-phase payload delivery: Response sent first (headers), then client fetches body via GetNextPayloadPart
- Pending payloads stored in `xsync.Map` keyed by hex(requestID), with background reaper goroutine (10s interval, 30s TTL)
- `MakeRLDPQueryHandler`: returns a closure for `RLDPWrapper.SetOnQuery` (rootQueryHandler slot)

### Provider Index (`internal/provider/index.go`)
- Maps bagID to serving node ADNL addresses via PebbleDB (`prov/<32-byte-bagID>` -> JSON `[]ProviderRecord`)
- Breaks DHT discoverability ceiling: DHT capped at `ActiveDHTLimit`, provider index serves all indexed bags
- `Register/Deregister/Lookup` methods for PebbleDB persistence
- Populated via `Persister.SetOnBagIndexed` callback when new bags are indexed

### Provider Handler (`internal/provider/handler.go`)
- Gin route: `GET /bags/:bagId` -> parse hex, lookup provider index, return JSON or 404
- Response: `{"bagId": "hex", "providers": [{"adnlAddress": "hex"}]}`

### Health Handler (`internal/health/handler.go`)
- Deep dependency checks: `greenfieldclient.Client.IsSubscribed()`, PebbleDB probe, `Server.IsRunning()`
- Returns 200 + `{"status":"ok","components":{...}}` or 503 + `{"status":"degraded",...}`

### Health Server (`internal/health/server.go`)
- TCP HTTP server bound to `127.0.0.1:HTTP_PORT` (localhost only)
- Timeouts: Read 5s, Write 10s, Idle 30s. Graceful shutdown on context cancel.

### Metrics (`internal/metrics/metrics.go`)
- Custom `prometheus.Registry` with gauges: `bags_registered_total`, `bags_downloading`, `ion_storage_active_transfers`, `cache_entries_total`, `index_entries_total`, `provider_registrations_total`
- Counters: `cache_hit_total`, `cache_miss_total`, `cache_evictions_total`, `provider_lookups_total`
- CounterVec: `greenfield_fetch_total` (labels: type, status)
- HistogramVec: `greenfield_fetch_duration_seconds` (labels: type)
- Cluster metrics: `cluster_nodes_active` (gauge), `cluster_bags_owned` (gauge), `cluster_crdt_deltas_sent`/`received` (counters), `cluster_conflicts_resolved` (counter), `cluster_piece_forwards_total` (counter, direction label), `cluster_piece_forward_duration_seconds` (histogram), `cluster_active_peer_connections` (gauge)
- Served at `GET /metrics` on private engine (or separate `METRICS_PORT` if configured)

### TL Schema (`internal/cluster/tl_schema.go`)
- TL constructor IDs for cluster protocols: `cluster.crdtHead`, `cluster.getBlock`/`cluster.block`/`cluster.blockNotFound`, `cluster.forwardPieceRequest`/`cluster.pieceResponse`/`cluster.pieceNotFound`
- Manual serialize/deserialize for all cluster message types
- `tl_register.go`: registers cluster TL types with `tl.Register()` for overlay dispatch

### PebbleDB Datastore Adapter (`internal/cluster/pebble_datastore.go`)
- Implements `ds.Batching` (go-datastore) backed by PebbleDB with key prefix `crdt/`
- Methods: Get/Put/Delete/Has/GetSize/Query/Batch/Sync/Close
- Does NOT own the `*pebble.DB` -- shared with other key prefixes

### Node Info (`internal/cluster/node_info.go`)
- Read/write helpers for `nodeinfo/<nodeID>` (JSON `{adnlAddr, ip, port}`) and `heartbeat/<nodeID>` (unix timestamp) CRDT keys
- `NodeInfo` struct for peer resolution during piece forwarding

### Cluster Metrics (`internal/cluster/cluster_metrics.go`)
- 8 Prometheus metrics registered on the shared registry
- Zero-value gauges registered unconditionally for consistency

### SingleNodeCoordinator (`internal/cluster/single_node.go`)
- Implements all cluster interfaces for non-cluster mode
- `OwnsBag` -> true, `OwnsOrClaim` -> true, `Owner` -> self, `ForwardGetPiece` -> unreachable error, `IsConnected` -> true, `ActiveNodeCount` -> 1

### ADNL Broadcaster (`internal/cluster/adnl_broadcast.go`)
- Implements `crdt.Broadcaster` interface over the ADNL cluster overlay
- `Broadcast()`: sends head CID notifications via `overlay.Broadcast()`
- `Next()`: blocks on incoming channel until next CID arrives or context cancelled

### ADNL DAG Service (`internal/cluster/adnl_dag_service.go`)
- Implements `ipld.DAGService` over ADNL (Bitswap-over-ADNL)
- `Get()`: local PebbleDB first (`block/<cid>` prefix), on miss fan-out to `min(3, peers)` via RLDP
- `Add()`: store in PebbleDB. Blocks are `dag.ProtoNode` (protobuf-encoded IPLD nodes)

### Cluster Transport (`internal/cluster/cluster_transport.go`)
- Wires the cluster overlay into the ADNL server
- Routes incoming cluster overlay messages by TL constructor to broadcaster, DAG service, or piece forwarder

### Coordinator (`internal/cluster/coordinator.go`)
- Central coordination: joins cluster overlay, creates PebbleDB adapter, Broadcaster, DAGService, initializes `crdt.New(...)`
- `Start(ctx)`: begins CRDT sync, heartbeat writer (configurable interval, default 60s), writes initial `nodeinfo`
- `Stop()`: leaves overlay, closes CRDT

### Ownership (`internal/cluster/ownership.go`)
- `ClaimBag`, `ReleaseBag`, `OwnsBag`, `OwnsOrClaim`, `Owner`, `OwnedCount`
- Dual-key CRDT format: `own/<hex-bagID>` -> `<nodeID>` (O(1) lookup) + `bynode/<nodeID>/<hex-bagID>` -> `""` (per-node enumeration)
- `OwnedCount` uses local atomic counter -- never iterates

### Reclamation (`internal/cluster/reclamation.go`)
- Dead node detection goroutine (configurable interval, default 5min)
- Scans `heartbeat/*` keys (O(nodes), not O(bags))
- XOR-closest responsibility ring: only the active node closest to the dead node executes reclamation
- Reclaims orphaned bags via `bynode/<deadNodeID>/` prefix scan

### Piece Forwarder (`internal/cluster/piece_forwarder.go`)
- Resolves owner from CRDT `nodeinfo`, dials via `gateway.RegisterClient`
- Sends `cluster.forwardPieceRequest` via RLDP, returns piece data + proof
- Direct ADNL peer-to-peer connections (not cluster overlay) for 128KB payloads

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
(*Server) PrivateKey() ed25519.PrivateKey
(*Server) IsRunning() bool
(*Server) SetHTTPBridge(b *RLDPHTTPBridge)
```

### RLDPHTTPBridge (public)
```go
NewRLDPHTTPBridge(ctx, *gin.Engine, *slog.Logger) *RLDPHTTPBridge
(*RLDPHTTPBridge) MakeRLDPQueryHandler(rl *overlay.RLDPWrapper) func([]byte, *rldp.Query) error
(*RLDPHTTPBridge) Stop()
```

### ProviderIndex (public)
```go
NewProviderIndex(db *pebble.DB, adnlAddr [32]byte, logger *slog.Logger) *ProviderIndex
(*ProviderIndex) Register(bagID [32]byte) error
(*ProviderIndex) Deregister(bagID [32]byte) error
(*ProviderIndex) Lookup(bagID [32]byte) ([]ProviderRecord, error)
provider.RegisterRoutes(router gin.IRouter, providerIndex *ProviderIndex)
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
(*OverlayManager) SetQueryHandler(QueryHandler)
(*OverlayManager) SetSessionCallback(SessionCallback)
(*OverlayManager) LookupBagID(overlayID [32]byte) ([32]byte, bool)
(*OverlayManager) HandleIncomingQuery(ctx, overlayID [32]byte, rawQuery []byte) ([]byte, error)
(*OverlayManager) NotifyNewSession(rldp RLDPDoQueryer, overlayID []byte, bagID [32]byte, sessionID int64)
(*OverlayManager) ActiveCount() int
```

### Handler (public)
```go
NewHandler(HandlerConfig) *Handler
(*Handler) HandleOverlayQuery(ctx, bagID [32]byte, rawQuery []byte) ([]byte, error)
```

### SessionInitiator (public)
```go
NewSessionInitiator(handler *Handler, logger *slog.Logger) *SessionInitiator
(*SessionInitiator) OnNewSession(rldp RLDPDoQueryer, overlayID []byte, bagID [32]byte, sessionID int64)
```

### Persister (public)
```go
NewPersister(db *pebble.DB) *Persister
(*Persister) LoadLastHeight() (int64, error)
(*Persister) LookupBag(bagID [32]byte) (BagLocation, bool, error)
(*Persister) PersistBagsAndHeight(entries []BagEntry, height int64) error
(*Persister) SetOnBagIndexed(cb BagIndexedCallback)
```

### Subscriber (public)
```go
NewSubscriber(client, persister, env, logger) *Subscriber
(*Subscriber) Run(ctx context.Context) error
```

### Fetcher (public)
```go
NewFetcher(client greenfieldclient.Client, logger *slog.Logger) *Fetcher
(*Fetcher) FetchMetadata(ctx, bucket, object string) (*boc.BagMetadata, error)
(*Fetcher) FetchSegment(ctx, bucket, object string, segmentIndex int, w io.Writer) ([]byte, error)
```

### BagMetadata / MerkleTree / TorrentHeader (public, in boc package)
```go
ParseIonStorageBoC(data []byte, logger *slog.Logger) (*BagMetadata, error)
BuildIonStorageBytes(torrentInfoBoC, merkleTreeBoC, headerBytes []byte) []byte
BuildMerkleTree(hashes [][32]byte) *cell.Cell
ComputePieceHashes(data []byte, pieceSize uint32) [][32]byte
GenerateMerkleProof(tree *cell.Cell, leafIndex, totalLeaves int) ([]byte, error)
ComputeOverlayID(bagID [32]byte) [32]byte
SerializeTorrentHeader(header *TorrentHeader) ([]byte, error)
ParseTorrentHeader(data []byte) (*TorrentHeader, error)
```

### MetadataStore (public)
```go
NewMetadataStore(db, fetcher, persister, logger) *MetadataStore
(*MetadataStore) PutBagMetadata(bagID [32]byte, rawBoC []byte) error
(*MetadataStore) GetBagMetadata(ctx, bagID [32]byte) (*boc.BagMetadata, error)
(*MetadataStore) DeleteBagMetadata(bagID [32]byte) error
(*MetadataStore) HasBagMetadata(bagID [32]byte) (bool, error)
```

### SegmentCache (public)
```go
NewSegmentCache(directory, ttl, onEvict, logger) *SegmentCache
(*SegmentCache) OpenBag(bagID [32]byte, layout BagFileLayout) error
(*SegmentCache) SegmentWriter(bagID [32]byte, segmentIndex int) (io.WriteCloser, error)
(*SegmentCache) MarkSegmentWritten(bagID [32]byte, segmentIndex int)
(*SegmentCache) GetSegment(bagID [32]byte, segmentIndex int) ([]byte, bool, error)
(*SegmentCache) HasSegment(bagID [32]byte, segmentIndex int) bool
(*SegmentCache) HasBag(bagID [32]byte) bool
```

### Coordinator (public)
```go
NewCoordinator(cfg CoordinatorConfig, adnlServer *Server, logger *slog.Logger) (*Coordinator, error)
NewSingleNodeCoordinator(nodeID string) *SingleNodeCoordinator
(*Coordinator) Start(ctx) error
(*Coordinator) Stop() error
(*Coordinator) ClaimBag(ctx, bagID [32]byte) error
(*Coordinator) ReleaseBag(ctx, bagID [32]byte) error
(*Coordinator) OwnsBag(bagID [32]byte) bool
(*Coordinator) OwnsOrClaim(ctx, bagID [32]byte) (bool, error)
(*Coordinator) Owner(bagID [32]byte) string
(*Coordinator) OwnedCount() int
(*Coordinator) IsConnected() bool
(*Coordinator) ActiveNodeCount() int
(*Coordinator) NodeADNLAddress(nodeID string) (adnlAddr [32]byte, ip string, port int, found bool)
```

### PieceForwarder (public)
```go
NewPieceForwarder(gateway *adnl.Gateway, coordinator *Coordinator, logger *slog.Logger) *PieceForwarder
(*PieceForwarder) ForwardGetPiece(ctx, bagID [32]byte, pieceID int) (data []byte, proof []byte, err error)
```

### Cluster Interfaces (consumed by other packages)
```go
// Consumed by index.Subscriber
type OwnershipChecker interface {
    OwnsOrClaim(ctx context.Context, bagID [32]byte) (bool, error)
}

// Consumed by storage.Handler
type LocalOwnershipChecker interface {
    OwnsBag(bagID [32]byte) bool
}

// Consumed by storage.Handler
type PieceForwarder interface {
    ForwardGetPiece(ctx context.Context, bagID [32]byte, pieceID int) (data []byte, proof []byte, err error)
}

// Consumed by provider.ProviderIndex
type OwnerResolver interface {
    Owner(bagID [32]byte) string
    NodeADNLAddress(nodeID string) (adnlAddr [32]byte, ip string, port int, found bool)
}

// Consumed by health.Deps
type ClusterChecker interface {
    IsConnected() bool
    ActiveNodeCount() int
}
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/xssnick/tonutils-go` | ADNL gateway, DHT, overlay, RLDP, TL serialization, TVM cells, merkle proofs |
| `github.com/xssnick/tonutils-storage` | Test-only: e2e download client, compatibility verification |
| `github.com/hashicorp/golang-lru/v2` | LRU cache with eviction callbacks, TTL-based expirable cache |
| `github.com/cockroachdb/pebble/v2` | PebbleDB for durable bag index, block height, metadata cache, and CRDT backing store |
| `github.com/ice-blockchain/ion/packages/greenfield-client` | Greenfield RPC subscription, object download, event parsing |
| `github.com/puzpuzpuz/xsync/v4` | Sharded concurrent map for in-memory bag index and segment tracking |
| `golang.org/x/sync` | singleflight for request coalescing |
| `github.com/gin-gonic/gin` | HTTP framework for health, metrics, and provider index routes (shared by TCP and RLDP transports) |
| `github.com/prometheus/client_golang` | Prometheus metrics registry and HTTP handler |
| `github.com/ipfs/go-ds-crdt` | CRDT datastore for distributed bag ownership |
| `github.com/ipfs/go-ipld-format` | `ipld.DAGService` interface for CRDT block exchange |
| `github.com/ipfs/go-datastore` | `ds.Batching` interface required by go-ds-crdt (PebbleDB adapter) |
| `github.com/ipfs/boxo/ipld/merkledag` | `dag.DecodeProtobufBlock` for IPLD node deserialization |
| `github.com/ipfs/go-block-format` | `blocks.NewBlock` for wrapping raw bytes as IPLD blocks |
| `github.com/stretchr/testify` | Test assertions |

## Design Decisions
- **`PORT` + `ADNL_EXTERNAL_ADDR` required**: no auto-detection of IPs or random ports in production code. Test helpers handle port allocation and external IP detection.
- **Provide Sweep via raw ADNL**: tonutils-go's DHT internals are all unexported. The sweeper sends `dht.FindNode`/`dht.Store` TL messages directly via `gateway.RegisterClient` + `peer.Query`.
- **Region index for O(1) sweep lookups**: with millions of bags, iterating all LRU keys per region tick is prohibitive. A secondary `map[uint8]map[[32]byte]struct{}` provides direct access.
- **Two-tier bag index**: in-memory xsync.Map for hot reads, PebbleDB for durability. No full rebuild on startup -- entries promoted lazily from PebbleDB on first access.
- **Event correlation**: subscriber only indexes SetTag events that have a matching CreateObject/UpdateObject in the same transaction. Prevents indexing orphaned tags.
- **Subscription query**: `BagIndexQuery` filters at the Tendermint level for both `onlineioEnv` and `ion-bag-id` CONTAINS, reducing irrelevant events.
- **Catch-up includes MsgSetTag**: the greenfield-client catch-up path handles `MsgSetTag` messages from historical blocks, ensuring no events are missed after restart.
- **MetadataStore fetch-on-miss**: single entry point for metadata. PebbleDB hit returns cached BoC. Miss triggers Greenfield fetch, caches result, returns parsed metadata.
- **Pieces hash over header+payload**: matches tonutils-storage's `CreateTorrent` format exactly. FileSize = headerSize + dataSize. Verified by e2e test: tonutils-storage client downloads and verifies pieces served by ion-connect-storage.
- **Merkle tree stored in .ionstorage v2**: full tree persisted to enable O(log N) proof generation. Proofs use TVM MerkleProof exotic cells via `cell.CreateProof(skeleton)`, passing `cell.CheckProof` verification.
- **Manual TL serialization**: storage protocol messages (`getTorrentInfo`, `getPiece`, etc.) are serialized manually without `tl.Register`. Avoids global TL registry conflicts when tonutils-storage is imported in test code.
- **Overlay ID = `tl.Hash(PublicKeyOverlay{Key: bagID})`**: matches tonutils-storage convention. The overlay manager LRU maps overlayID -> bagID for reverse lookup on incoming queries.
- **Bidirectional session init**: when a Ping arrives, the seeder sends its own `AddUpdate(UpdateInit)` with all-ones bitfield back to the downloader via RLDP. Required by tonutils-storage protocol -- both sides must exchange bitfields.
- **RLDP connection handler**: `gateway.SetConnectionHandler` fires asynchronously (goroutine). The handler wraps each peer with `overlay.CreateExtendedADNL` + `overlay.CreateExtendedRLDP` for overlay query dispatch. `Start()` must be called on the downloader torrent before `ConnectToNode` to initialize `globalCtx`.
- **Greenfield stores payload only**: header embedded in `.ionstorage`. Segment cache stores raw Greenfield data. Piece slicer prepends header at serve time.
- **singleflight with TeeReader**: `FetchSegment` coalesces concurrent requests. Cache populated on first fetch via TeeReader.
- **Per-file disk cache**: mirrors torrent file structure. No `_header` file -- header in PebbleDB.
- **CGO_ENABLED=0**: tonutils-go and PebbleDB are pure Go.
- **Two Gin engines**: public engine (provider index) served via RLDP on ADNL port, private engine (health + metrics) on `127.0.0.1:HTTP_PORT`. Provider index is reachable via `.adnl` domains through tonutils-proxy. Health/metrics are internal only.
- **HTTP-over-RLDP via RLDPWrapper.rootQueryHandler**: the overlay `RLDPWrapper.queryHandler` first tries `UnwrapQuery`. If overlay-wrapped, dispatches to overlay handler. If not, falls through to `rootQueryHandler` where the RLDP-HTTP bridge handles HTTP requests. No separate RLDP client needed -- same connection handles both storage protocol and HTTP.
- **GetCapabilities on extADNL.SetQueryHandler**: must be set on the `ADNLWrapper` (not raw peer) because `overlay.CreateExtendedADNL` replaces the peer's query handler. Non-overlay ADNL queries fall through to `rootQueryHandler`.
- **Pending payload reaper**: background goroutine (10s interval) cleans `xsync.Map` entries older than 30s. Required for high traffic -- lazy cleanup would accumulate stale entries between bursts.
- **Provider index populated via callback**: `Persister.SetOnBagIndexed` fires after each successful `PersistBagsAndHeight`, calling `ProviderIndex.Register` for each new bag. No startup scan -- bags registered as they are indexed.
- **PebbleDB key prefix `prov/`**: disjoint from `idx/` (bag index), `meta/` (metadata cache), `crdt/` (CRDT state), and `block/` (IPLD blocks). Provider records stored as JSON `[]ProviderRecord`.
- **Separate METRICS_PORT**: if `METRICS_PORT` env var set and differs from `HTTP_PORT`, metrics served on a separate localhost-only HTTP server. Allows production to isolate scraping from health probes.
- **Three-layer transport**: cluster overlay for CRDT gossip (control plane), direct ADNL for piece forwarding (data plane), lazy per-bag overlays for client compatibility. Separation prevents data-plane traffic from degrading CRDT convergence.
- **CRDT OR-Set for ownership**: `go-ds-crdt` convergence handles concurrent claims deterministically. No application-level tiebreaker needed.
- **Dual-key ownership format**: `own/<bagID>` for O(1) lookup + `bynode/<nodeID>/<bagID>` for O(k) per-node enumeration. Prevents O(total bags) scans.
- **Ownership persists through cache eviction**: CRDT claims are NOT released on TTL expiry. Releasing on every eviction would create millions of daily Put/Delete mutations, bloating the Merkle-DAG indefinitely. Claims released only on explicit `ReleaseBag`.
- **XOR-closest responsibility ring for reclamation**: prevents thundering herd where all nodes simultaneously detect a dead node and fire concurrent CRDT mutations.
- **Direct ADNL for piece forwarding**: 128KB payloads route point-to-point, not through the cluster overlay. At high forwarding volume the overlay would become a bottleneck.
- **SingleNodeCoordinator**: all cluster interfaces have a non-cluster implementation that returns true/self. No nil checks needed throughout the codebase.
- **Startup ordering**: coordinator starts before subscriber. Bags indexed without CRDT claims would be invisible to the cluster.
