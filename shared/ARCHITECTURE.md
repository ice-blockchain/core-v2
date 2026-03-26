# ION Pulse -- Architecture Index

ION Pulse is a decentralized P2P offline-first graph database. Each module is an independent package under `shared/ion/pulse/`.

Read this file first to find the module you need, then read that module's `ARCHITECTURE.md` for implementation details.

## Modules

| Module | Package | Path | Description |
|---|---|---|---|
| Pulse Graph | `@ion/pulse-graph` | [graph/](ion/pulse/graph/ARCHITECTURE.md) | Graph data model, nodes, souls, links, denormalization |
| Pulse Sync | `@ion/pulse-sync` | [sync/](ion/pulse/sync/ARCHITECTURE.md) | CRDT merge engine via Yjs Y.Doc sync protocol |
| Pulse Mesh | `@ion/pulse-mesh` | [mesh/](ion/pulse/mesh/ARCHITECTURE.md) | P2P transport, GossipSub, DHT peer discovery |
| Pulse Store | `@ion/pulse-store` | [store/](ion/pulse/store/ARCHITECTURE.md) | Storage adapters: LMDB (server), IndexedDB (browser), SQLite (mobile) |
| Pulse Vault | `@ion/pulse-vault` | [vault/](ion/pulse/vault/ARCHITECTURE.md) | Ed25519 signing, AES-GCM encryption, X25519 key exchange |
| Pulse Signal | `@ion/pulse-signal` | [signal/](ion/pulse/signal/ARCHITECTURE.md) | Real-time pub/sub subscriptions with wildcard matching |
| Pulse Shard | `@ion/pulse-shard` | [shard/](ion/pulse/shard/ARCHITECTURE.md) | Consistent hashing ring, shard routing, replica management |
| Pulse Reaper | `@ion/pulse-reaper` | [reaper/](ion/pulse/reaper/ARCHITECTURE.md) | TTL expiry, GDPR hard delete, tombstone pruning |
| Pulse Lens | `@ion/pulse-lens` | [lens/](ion/pulse/lens/ARCHITECTURE.md) | Semantic vector search (LanceDB planned, in-memory current) |
| Pulse Aggregate | `@ion/pulse-aggregate` | [aggregate/](ion/pulse/aggregate/ARCHITECTURE.md) | Analytics: counting, grouping, time-series (DuckDB + in-memory) |
| Pulse Cache | `@ion/pulse-cache` | [cache/](ion/pulse/cache/ARCHITECTURE.md) | Non-authoritative hot data LRU cache with TTL |
| Pulse Bench | `@ion/pulse-bench` | [bench/](ion/pulse/bench/ARCHITECTURE.md) | Benchmarking, Docker relay clusters, integration scenarios |
