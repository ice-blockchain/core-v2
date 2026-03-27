# Shared Architecture

Cross-platform shared packages and frameworks.

## ION Pulse

Decentralized relay server framework. Multi-tenant DB-as-a-Service with signed event verification, hybrid sharding, and federated global queries.

**Language:** Rust + embedded C/C++ libraries (LMDB, DuckDB, libsodium, SQLite).

**Location:** [pulse/](pulse/)

**Architecture:** [pulse/ARCHITECTURE.md](pulse/ARCHITECTURE.md)

### Cargo Workspace

All crates live under `shared/pulse/` in a single Cargo workspace (`shared/pulse/Cargo.toml`).

| Crate | Type | Purpose |
|-------|------|---------|
| `pulse-types` | lib | SignedEvent struct, kind ranges, shared error types |
| `pulse-auth` | lib | Ed25519 verify, SHA-256 event ID, TON address derivation, rate limiting (governor) |
| `pulse-transport` | lib | WebTransport server, ADNL bridge, HTTP/1.1 fallback, connection manager |
| `pulse-graph` | lib | Graph store on LMDB (6 named databases) |
| `pulse-kv` | lib | KV store on LMDB (user_kv, kv_meta) |
| `pulse-vector` | lib | ANN vector search on Lance |
| `pulse-analytics` | lib | Columnar analytics on DuckDB |
| `pulse-sql` | lib | SQL query API on DataFusion |
| `pulse-schema` | lib | Schema registry, validation, versioning, engine mappings |
| `pulse-tenant` | lib | Multi-tenant isolation, lifecycle, quotas |
| `pulse-signal` | lib | Path trie subscription engine |
| `pulse-shard` | lib | Consistent hash ring, auto-repair, cleanup, rebalance |
| `pulse-federation` | lib | Scatter-gather coordinator for federated queries, vector merge |
| `pulse-reaper` | lib | GC sweeps, tombstone TTL, GDPR erasure |
| `pulse-relay` | bin | Single deployable binary (all crates wired) |
| `pulse-bench` | bin+bench | Benchmarking harness (criterion) |

### Client Architecture Outlines

| Platform | Location | Key Libraries |
|----------|----------|---------------|
| Web | [clients/web/](pulse/clients/web/ARCHITECTURE.md) | WebTransport API, @noble/ed25519, IndexedDB |
| Android | [clients/mobile/](pulse/clients/mobile/ARCHITECTURE.md) | Cronet, Tink, Room |
| iOS | [clients/mobile/](pulse/clients/mobile/ARCHITECTURE.md) | Network.framework, CryptoKit, SwiftData |
| Desktop | [clients/desktop/](pulse/clients/desktop/ARCHITECTURE.md) | Shared Rust crates (wtransport, sodiumoxide, heed) |

### Data Flow

```
Transport (WebTransport / ADNL bridge / HTTP fallback)
  -> Auth (Ed25519 verify + rate limit)
  -> Tenant (resolve + quota check)
  -> Schema (validate against tenant's schema)
  -> Router (kind-based API dispatch)
  -> Storage Engine (LMDB / DuckDB / Lance / DataFusion)
  -> Shard (replication to other relays)
  -> Signal (notify subscribers)
```
