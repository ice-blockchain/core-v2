# ION Connect Storage -- Architecture

## Purpose

Virtual TON Storage protocol node that serves files cached from BNB Greenfield. Listens on ADNL/RLDP, implements TON storage RPC methods, and uses an LRU+TTL disk cache. Designed to scale to millions of bags using lazy DHT registration, CRDT-based cluster coordination, and hot/cold classification.

## Current State: Phase 3 (Caching Layer)

Phase 1 (ADNL server, DHT registration, overlay management) and Phase 2 (Greenfield event subscription, bag index, metadata/segment fetching) are complete. Phase 3 adds torrent header parsing, per-file disk caching with TTL eviction, PebbleDB metadata persistence with fetch-on-miss, and TeeReader-based streaming from Greenfield to cache.

## .ionstorage Format

The `.ionstorage` companion object on Greenfield stores both the TorrentInfo BoC and the serialized torrent header in a length-prefixed format:

```
[4 bytes LE: TorrentInfo BoC length]
[TorrentInfo BoC bytes]
[serialized torrent header bytes (TL-boxed)]
```

- **TorrentInfo BoC**: Standard TVM cell (compatible with tonutils-storage). Layout: `pieceSize(32) | fileSize(64) | rootHash(256) | headerSize(64) | headerHash(256) | description(8)`. Description is stored inline (not as reference). BagID = `SHA256(CellRepr(torrentInfoCell))`.
- **Torrent header**: TL-boxed binary format (`torrent_header#9128aab7`). Contains file names, sizes, and directory structure. Parsed via `boc.ParseTorrentHeader`, serialized via `boc.SerializeTorrentHeader`.
- **FileSize**: Raw file data size only (excludes torrent header). Pieces are hashed over the raw file data.
- **headerHash**: `SHA256(serializedTorrentHeader)`. headerSize = length of serialized header bytes.

Note: tonutils-storage's `CreateTorrent` hashes pieces over `headerData + fileData` and sets `FileSize = headerSize + dataSize`. ION hashes pieces over file data only. The `boc` package's primitives (merkle tree, cell builder, header serializer) are compatible with both approaches, verified by compatibility tests against `tonutils-storage.CreateTorrentWithInitialHeader`.

## Data Structures

### Config (`internal/config/config.go`)
- `Config` struct parsed from environment variables
- Required: `ADNL_PRIVATE_KEY`, `PORT`, `ADNL_EXTERNAL_ADDR`, `GLOBAL_CONFIG_URL`, `GREENFIELD_RPC_URLS`, `GREENFIELD_PRIVATE_KEY`, `ONLINEIO_ENV`
- Defaults: `CACHE_TTL=24h`, `CACHE_DIR=/data/cache`, `ACTIVE_DHT_LIMIT=100000`, `HTTP_PORT=8080`, `DATA_DIR=/data/db`

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
- `FetchMetadata`: downloads `<object>.ionstorage`, parses into `BagMetadata` via `boc.ParseIonStorageBoC`
- `FetchSegment`: downloads a 16MB segment via `GetObject` with `Range` header. Accepts optional `io.Writer` for TeeReader-based simultaneous caching. Reader closed immediately after `io.ReadAll`.
- When `w != nil`, `io.TeeReader(greenfieldStream, w)` streams to the writer during read. Singleflight is preserved -- first concurrent caller's writer receives the tee data, all callers share the returned `[]byte`.

### BagMetadata (`internal/boc/bag_metadata.go`)
- Parsed from `.ionstorage` format (length-prefixed BoC + torrent header)
- Fields: BagID, PieceSize, FileSize, HeaderSize, HeaderHash, RootHash, PieceCount, Header (*TorrentHeader), RawBoC
- `ParseIonStorageBoC`: reads 4-byte BoC length, parses TorrentInfo cell, parses trailing header bytes
- `BuildIonStorageBytes`: constructs the `.ionstorage` format from BoC + header bytes

### TorrentHeader (`internal/boc/torrent_header.go`)
- Parsed from TL-boxed binary format (`torrent_header#9128aab7`)
- Wire format (little-endian): `TL_ID(4) | FilesCount(4) | TotalNameSize(8) | TotalDataSize(8) | FEC_ID(4) | DirNameSize(4) | DirName | NameIndex[] | DataIndex[] | Names`
- `SerializeTorrentHeader`: produces TL-boxed bytes identical to `tl.Serialize(tonstorage.TorrentHeader{}, true)`
- `ParseTorrentHeader`: manual binary parse (non-standard TL array layout)
- `FileEntry{Name, Size, Offset}`: per-file metadata extracted from indices
- Compatibility with tonutils-storage verified by `compatibility_test.go` using `CreateTorrentWithInitialHeader`

### Constants (`internal/boc/constants.go`)
- `SegmentSize = 16MB`, `PieceSize = 512KB`, `PiecesPerSegment = 32`

### Testing Helpers (`internal/boc/testing_helpers.go`)
- `BuildIonStorageBoC(payload, pieceSize, header)`: constructs `.ionstorage` from payload + header
- `BuildTorrentInfoCell`: builds standard TorrentInfo TVM cell (inline description, no refs)
- `BuildMerkleTree`: binary merkle tree of TVM cells, padded to power of 2 with zero-hash cells (matches tonutils-storage)
- `SingleFileHeader(name, size)`: convenience for single-file torrent headers
- `Must*` variants with `t.Helper()` for test use

### MetadataStore (`internal/cache/metadata_store.go`)
- PebbleDB-backed metadata cache with Greenfield fetch-on-miss
- Key scheme: `meta/<32-byte-bagID>` (raw .ionstorage bytes), disjoint from `idx/` prefix
- `GetBagMetadata(ctx, bagID)`: checks PebbleDB first. On miss, looks up bag location in index, fetches `.ionstorage` from Greenfield, stores in PebbleDB, returns parsed `*BagMetadata`
- Single entry point for metadata -- Phase 4 handlers call this, not the fetcher directly

### SegmentCache (`internal/cache/segment_cache.go`)
- Per-file disk cache with TTL eviction via `hashicorp/golang-lru/v2/expirable`
- Cache structure: `<cacheDir>/<hex(bagID)>/<fileName>` -- one file per torrent entry, pre-allocated via `Truncate`
- No `_header` file -- torrent header lives in PebbleDB metadata store
- `OpenBag(bagID, layout)`: creates directory, pre-allocates files from `BagFileLayout`
- `SegmentWriter(bagID, segIdx)`: returns `io.WriteCloser` that distributes bytes to correct files via `WriteAt`. Files opened/closed per operation (minimal FD usage)
- `MarkSegmentWritten(bagID, segIdx)`: records segment as cached in `xsync.Map`
- `GetSegment(bagID, segIdx)`: reads from files via `ReadAt`, assembles contiguous buffer
- `BagFileLayout{Files, TotalSize}`: describes file structure for segment distribution. TotalSize = raw file data (no header)
- Eviction callback: `os.RemoveAll(bagDir)`, deregister DHT + leave overlay
- `segmentDistributor`: `io.WriteCloser` that maps sequential segment bytes to correct cache files based on offset layout, handling cross-file boundaries

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
(*Fetcher) FetchMetadata(ctx, bucket, object string) (*boc.BagMetadata, error)
(*Fetcher) FetchSegment(ctx, bucket, object string, segmentIndex int, w io.Writer) ([]byte, error)
```

### BagMetadata / TorrentHeader (public, in boc package)
```go
ParseIonStorageBoC(data []byte, logger *slog.Logger) (*BagMetadata, error)
BuildIonStorageBytes(torrentInfoBoC, headerBytes []byte) []byte
SerializeTorrentHeader(header *TorrentHeader) ([]byte, error)
ParseTorrentHeader(data []byte) (*TorrentHeader, error)
BuildTorrentInfoCell(pieceSize, fileSize, rootHash, headerHash, headerSize) (*cell.Cell, error)
BuildMerkleTree(hashes [][32]byte) *cell.Cell
BuildIonStorageBoC(payload []byte, pieceSize uint32, header *TorrentHeader) ([32]byte, []byte, error)
SingleFileHeader(name string, dataSize uint64) *TorrentHeader
```

### MetadataStore (public)
```go
NewMetadataStore(db *pebble.DB, fetcher *greenfield.Fetcher, persister *index.Persister, logger) *MetadataStore
(*MetadataStore) PutBagMetadata(bagID [32]byte, rawBoC []byte) error
(*MetadataStore) GetBagMetadata(ctx, bagID [32]byte) (*boc.BagMetadata, error)
(*MetadataStore) DeleteBagMetadata(bagID [32]byte) error
(*MetadataStore) HasBagMetadata(bagID [32]byte) (bool, error)
```

### SegmentCache (public)
```go
NewSegmentCache(directory string, ttl time.Duration, onEvict func(bagID [32]byte), logger) *SegmentCache
(*SegmentCache) OpenBag(bagID [32]byte, layout BagFileLayout) error
(*SegmentCache) SegmentWriter(bagID [32]byte, segmentIndex int) (io.WriteCloser, error)
(*SegmentCache) MarkSegmentWritten(bagID [32]byte, segmentIndex int)
(*SegmentCache) GetSegment(bagID [32]byte, segmentIndex int) ([]byte, bool, error)
(*SegmentCache) HasSegment(bagID [32]byte, segmentIndex int) bool
(*SegmentCache) HasBag(bagID [32]byte) bool
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/xssnick/tonutils-go` | ADNL gateway, DHT client, overlay networking, TL serialization, TVM cell parsing |
| `github.com/xssnick/tonutils-storage` | Test-only: compatibility verification via `CreateTorrentWithInitialHeader` |
| `github.com/hashicorp/golang-lru/v2` | LRU cache with eviction callbacks, TTL-based expirable cache |
| `github.com/cockroachdb/pebble/v2` | PebbleDB for durable bag index, block height, and metadata cache |
| `github.com/ice-blockchain/ion/packages/greenfield-client` | Greenfield RPC subscription, object download, event parsing |
| `github.com/puzpuzpuz/xsync/v4` | Sharded concurrent map for in-memory bag index and segment tracking |
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
- **singleflight with TeeReader**: `FetchSegment` coalesces concurrent requests. When `w != nil`, the first caller's writer receives the tee data. All callers share the returned `[]byte`.
- **Per-file disk cache**: cache mirrors torrent file structure (`<dir>/<hex(bagID)>/<fileName>`). Files pre-allocated via `Truncate`. No `_header` file -- header in PebbleDB. FDs opened/closed per operation.
- **MetadataStore fetch-on-miss**: single entry point for metadata. PebbleDB hit returns cached BoC. Miss triggers Greenfield fetch, caches result, returns parsed metadata.
- **.ionstorage format**: length-prefixed BoC + torrent header. TorrentInfo cell uses standard format (compatible with tonutils-storage). Torrent header appended after BoC for self-contained metadata.
- **ION vs standard TON piece hashing**: ION hashes pieces over raw file data only. Standard TON hashes over header+payload. Both approaches use the same primitives (merkle tree, cell builder). Compatibility verified in tests.
- **slog over zerolog**: master-plan specifies `slog.Logger` (stdlib). greenfield-client abstracted via Logger interface with zerolog/slog adapters.
- **CGO_ENABLED=0**: tonutils-go and PebbleDB are pure Go, no C dependencies.
- **No `tl.Register` in production**: avoids global TL registry conflicts when tonutils-storage is imported in tests. Header serialization uses manual binary encoding matching TL wire format.
