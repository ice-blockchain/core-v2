# pulse-graph

LMDB-backed graph store with six named databases for event storage, node indexing, edge tracking, and chronological/type-based indexes.

## Crate

`pulse-graph` -- `shared/pulse/graph/`

## Dependencies

- `heed` 0.20+ (LMDB bindings)
- `crossbeam-channel` (batched write channel)
- `pulse-types` (SignedEvent)

## LMDB Database Layout

| Database | Key | Value | Purpose |
|----------|-----|-------|---------|
| `events` | `event_id (32 bytes)` | `serialized SignedEvent` | Canonical event storage |
| `nodes` | `pubkey + kind + d_tag` | `latest event_id` | Replaceable event index |
| `edges_out` | `from_pubkey + edge_kind(u32) + to_pubkey` | `event_id` | Outgoing edges (follows, replies) |
| `edges_in` | `to_pubkey + edge_kind(u32) + from_pubkey` | `event_id` | Incoming edges (followers, mentions) |
| `timeline` | `created_at(u64 BE) + event_id` | `(empty)` | Chronological index |
| `by_kind` | `kind(u32 BE) + created_at + event_id` | `(empty)` | Events by type |

## API

```rust
pub struct GraphStore { .. }
impl GraphStore {
    pub fn open(path: &Path, map_size: usize) -> Result<Self, GraphStoreError>;
    pub fn put_event(&self, event: SignedEvent) -> Result<(), GraphStoreError>;
    pub fn get_event(&self, event_id: &[u8; 32]) -> Result<Option<SignedEvent>, GraphStoreError>;
    pub fn get_latest_node(&self, pubkey: &[u8; 32], kind: u32) -> Result<Option<SignedEvent>, GraphStoreError>;
}
```

## Write Batching

Writes are buffered via `crossbeam-channel` and flushed every 250ms or when the buffer reaches 1000 events, whichever comes first. Single writer thread using `recv_timeout` for the timer.

## Files

| File | Purpose |
|------|---------|
| `src/graph_store.rs` | GraphStore, LMDB init, batched write loop |
| `src/graph_query.rs` | GraphQuery, timeline iteration with filters |
| `src/adjacency.rs` | EdgeKey serialization, EdgeDirection |
