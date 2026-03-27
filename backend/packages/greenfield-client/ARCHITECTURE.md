# greenfield-client Architecture

> Reusable Go library for interacting with BNB Greenfield blockchain.

---

## Data Structures

| Type | Purpose |
|---|---|
| `Client` | Public interface with 6 methods: Subscribe, IsSubscribed, GetObject, FGetObject, FGetObjectResumable, Close |
| `TxEvent` | Parsed transaction event: Height, TxHash, Events[] |
| `ABCIEvent` | Single event with Type string and Attributes map |
| `SubscribeOpts` | Subscription config: LastHeight (resume point), Query (Tendermint filter) |
| `GetObjectOpts` | Download options: Range header for partial downloads |
| `ObjectStat` | Object metadata: ObjectName, ContentType, Size |
| `Config` | Client configuration: RpcURLs[], ChainID, PrivateKey, Logger |

### Internal types (gateway-types.go)

JSON response mappings for Greenfield RPC: `blockWithTxsResponse`, `txObject`, `txBody`, `blockInfo`, `blockHeader`, `blockData`, `latestBlockResponse`, `txMessage`.

---

## API Surface

```go
type Client interface {
    Subscribe(ctx context.Context, opts SubscribeOpts) (<-chan TxEvent, error)
    IsSubscribed() bool
    GetObject(ctx context.Context, bucket, object string, opts GetObjectOpts) (io.ReadCloser, ObjectStat, error)
    FGetObject(ctx context.Context, bucket, object, filePath string, opts GetObjectOpts) error
    FGetObjectResumable(ctx context.Context, bucket, object, filePath string, opts GetObjectOpts) error
    Close() error
}
```

### Key behaviors

- **Subscribe** starts a WebSocket connection, catches up from `LastHeight`, then streams live events.
- **Round-robin RPC failover** rotates through configured endpoints on connection failure (atomic counter).
- **Exponential backoff** on subscription errors: 1s to 30s.
- **Catch-up logic** iterates block-by-block from last known height to chain tip, extracting events from raw transactions.
- **Object download** wraps greenfield-go-sdk for streaming, file, and resumable downloads.

---

## Dependencies

| Dependency | Why |
|---|---|
| `github.com/bnb-chain/greenfield-go-sdk` | Official SDK for Greenfield object storage operations |
| `github.com/cometbft/cometbft` | Tendermint/CometBFT types for WebSocket subscription |
| `github.com/cosmos/cosmos-sdk` | Cosmos transaction parsing and type definitions |
| `github.com/rs/zerolog` | Structured logging |
| `github.com/akuity/grpc-gateway-client` | HTTP client for gRPC-gateway Greenfield endpoints |

No internal ION package dependencies. This is a standalone library.

---

## Config Options

| Field | Type | Required | Description |
|---|---|---|---|
| `RpcURLs` | `[]string` | Yes | Greenfield RPC endpoints (round-robin failover) |
| `ChainID` | `string` | Yes | Greenfield chain identifier |
| `PrivateKey` | `string` | Yes | Hex-encoded private key for SDK authentication |
| `Logger` | `zerolog.Logger` | Yes | Structured logger instance |

`SenderTagKey()` returns `"onlineioEnv"` -- used to filter events by ION environment tag.

`DefaultQuery()` returns the Tendermint event query string for filtering `EventCreateObject` and `EventUpdateObjectContent` events.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Go library (not TypeScript) | Greenfield SDK is Go-native; avoids FFI overhead and maintains type safety with blockchain types |
| Round-robin RPC with atomic counter | Simple failover without external load balancer; survives individual node outages |
| WebSocket + block catch-up hybrid | WebSocket for low-latency live events; catch-up ensures no missed events during disconnects |
| SHA256 tx hash computation | Deterministic hash from raw transaction bytes for deduplication downstream |
| Separate subscriber.go and catchup.go | Live subscription and historical catch-up have different error handling and iteration patterns |
| Channel-based event delivery | Decouples event production from consumption; consumer controls backpressure |
