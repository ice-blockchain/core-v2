# ION Pulse

Decentralized relay server framework written in Rust. Deploys as a single binary with all storage engines embedded. Provides multi-tenant DB-as-a-Service with Ed25519-signed event verification, hybrid sharding, and federated global queries.

## Stack

- **Language:** Rust (async via tokio)
- **Embedded C/C++:** LMDB (heed), DuckDB (duckdb), libsodium (sodiumoxide), SQLite (rusqlite)
- **Embedded Rust:** Lance (vector DB), DataFusion (SQL engine), wtransport (WebTransport)
- **Deployment:** Single binary per relay node (`pulse-relay`), all services co-located, feature-flaggable

## Signed Event Format

Every write is a signed event. The server verifies the Ed25519 signature (TON wallet keypair) before processing. Events are routed to the appropriate API by `kind` field.

```rust
struct SignedEvent {
    id: [u8; 32],           // SHA-256(pubkey || created_at || kind || tags || content)
    pubkey: [u8; 32],       // Ed25519 public key (= TON wallet key)
    created_at: u64,        // Unix timestamp seconds
    kind: u32,              // Event type -> determines API routing
    tags: Vec<Vec<String>>, // Structured metadata
    content: Vec<u8>,       // Payload (JSON or binary)
    sig: [u8; 64],          // Ed25519 signature over id
}
```

| Kind Range | API | Examples |
|------------|-----|---------|
| 0-999 | Graph | profile, post, reply, follow |
| 1000-1999 | KV | app_settings, preference, bookmark |
| 2000-2999 | Vector | embedding, image_vector, content_vector |
| 3000-3999 | Analytics | view, reaction, share, trade |
| 4000-4999 | SQL | query, create_table, alter_table, drop_table |

## Modules

| Module | Crate | Path | Architecture | Purpose |
|--------|-------|------|-------------|---------|
| Types | `pulse-types` | [types/](types/) | — | SignedEvent, kind routing, PulseError |
| Auth | `pulse-auth` | [auth/](auth/) | [auth/ARCHITECTURE.md](auth/ARCHITECTURE.md) | Ed25519 verify (libsodium), SHA-256 id, TON address, rate limiting |
| Transport | `pulse-transport` | [transport/](transport/) | [transport/ARCHITECTURE.md](transport/ARCHITECTURE.md) | WebTransport server, ADNL bridge, HTTP fallback, connection manager |
| Graph | `pulse-graph` | [graph/](graph/) | [graph/ARCHITECTURE.md](graph/ARCHITECTURE.md) | Graph store on LMDB (events, nodes, edges, indexes) |
| KV | `pulse-kv` | [kv/](kv/) | [kv/ARCHITECTURE.md](kv/ARCHITECTURE.md) | Fast KV store on LMDB (user_kv, kv_meta) |
| Vector | `pulse-vector` | [vector/](vector/) | [vector/ARCHITECTURE.md](vector/ARCHITECTURE.md) | ANN vector search on Lance |
| Analytics | `pulse-analytics` | [analytics/](analytics/) | [analytics/ARCHITECTURE.md](analytics/ARCHITECTURE.md) | Columnar analytics on DuckDB |
| SQL | `pulse-sql` | [sql/](sql/) | [sql/ARCHITECTURE.md](sql/ARCHITECTURE.md) | SQL query API on DataFusion |
| Schema | `pulse-schema` | [schema/](schema/) | [schema/ARCHITECTURE.md](schema/ARCHITECTURE.md) | Unified schema registry, validation, engine mappings |
| Tenant | `pulse-tenant` | [tenant/](tenant/) | [tenant/ARCHITECTURE.md](tenant/ARCHITECTURE.md) | Multi-tenant isolation, lifecycle, quotas |
| Signal | `pulse-signal` | [signal/](signal/) | [signal/ARCHITECTURE.md](signal/ARCHITECTURE.md) | Real-time subscriptions via path trie |
| Shard | `pulse-shard` | [shard/](shard/) | [shard/ARCHITECTURE.md](shard/ARCHITECTURE.md) | Consistent hash ring, auto-repair, cleanup, rebalance |
| Federation | `pulse-federation` | [federation/](federation/) | [federation/ARCHITECTURE.md](federation/ARCHITECTURE.md) | Scatter-gather coordinator, vector merge |
| Reaper | `pulse-reaper` | [reaper/](reaper/) | [reaper/ARCHITECTURE.md](reaper/ARCHITECTURE.md) | GC sweeps, tombstone TTL, GDPR erasure |
| Relay | `pulse-relay` | [relay/](relay/) | — | Single binary server, event pipeline, shard repair scheduler |
| Bench | `pulse-bench` | [bench/](bench/) | [bench/ARCHITECTURE.md](bench/ARCHITECTURE.md) | Benchmarking harness (criterion) |

## Data Flow (Relay Server)

```
Transport (WebTransport / ADNL bridge / HTTP fallback)
  -> Auth (Ed25519 verify + rate limit via governor)
  -> Tenant (resolve tenant_id, check quota)
  -> Schema (validate event against tenant's schema for this kind)
  -> Router (kind-based API dispatch, using schema's engine mappings)
  -> Storage Engine (LMDB / DuckDB / Lance / DataFusion)
  -> Shard (replicate to peer relays)
  -> Signal (notify subscribers via path trie)

Implemented in: relay/src/event_pipeline.rs
```

## Dependencies

### Embedded C/C++ Libraries

| Library | Language | Rust Crate | Maturity | Used By |
|---------|----------|-----------|----------|---------|
| LMDB | C | `heed` 0.20+ | 12+ years | Graph, KV, Schema, Tenant |
| libsodium | C | `sodiumoxide` 0.2+ | 11+ years | Auth, Shard |
| DuckDB | C++ | `duckdb` 1.1+ | 6+ years | Analytics |
| SQLite | C | `rusqlite` 0.32+ | 24+ years | Tenant registry |

### Rust Crates

| Crate | Purpose | Used By |
|-------|---------|---------|
| `heed` | LMDB bindings | Graph, KV, Schema |
| `sodiumoxide` | libsodium bindings | Auth, Shard |
| `duckdb` | DuckDB bindings | Analytics |
| `datafusion` | SQL engine (multi-threaded, Arrow) | SQL |
| `lance` + `arrow` | Vector DB | Vector |
| `wtransport` | WebTransport server | Transport |
| `tokio` | Async runtime | All |
| `governor` | Rate limiting | Auth |
| `crossbeam-channel` | MPSC channels | Graph (write batching) |
| `lru` | LRU cache | Tenant resolver |
| `criterion` | Benchmarks | Bench |

## Client Architecture

| Platform | Location | Stack |
|----------|----------|-------|
| Web | [clients/web/](clients/web/ARCHITECTURE.md) | WebTransport, @noble/ed25519, IndexedDB |
| Mobile (Android) | [clients/mobile/](clients/mobile/ARCHITECTURE.md) | Cronet, Tink, Room |
| Mobile (iOS) | [clients/mobile/](clients/mobile/ARCHITECTURE.md) | Network.framework, CryptoKit, SwiftData |
| Desktop | [clients/desktop/](clients/desktop/ARCHITECTURE.md) | Shared Rust crates |

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Event verification | 50K/s per core | libsodium Ed25519 (~20us) |
| KV read | 500K/s per core | LMDB mmap (~2us) |
| KV write (batched) | 100K/s per core | LMDB batched (~10us amortized) |
| Vector search (1M vectors) | 200 queries/s | Lance IVF-PQ (~5ms) |
| Schema validation | < 5us per event | In-memory lookup + field check |
| Tenant provisioning | < 500ms | mkdir + LMDB env + DuckDB init |
| Concurrent connections | 100K per relay | tokio + WebTransport |
| Memory (idle relay) | < 50 MB | No GC, no V8 heap |
| Binary size | < 30 MB | Static linking, LTO, strip |
