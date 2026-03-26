# ION Pulse -- Architecture Index

ION Pulse is a decentralized P2P offline-first graph database. Each module is an independent package under `shared/ion/pulse/`.

## Modules

| Module | Package | Architecture |
|---|---|---|
| Pulse Graph | `@ion/pulse-graph` | [graph/ARCHITECTURE.md](ion/pulse/graph/ARCHITECTURE.md) |
| Pulse Sync | `@ion/pulse-sync` | [sync/ARCHITECTURE.md](ion/pulse/sync/ARCHITECTURE.md) |
| Pulse Mesh | `@ion/pulse-mesh` | [mesh/ARCHITECTURE.md](ion/pulse/mesh/ARCHITECTURE.md) |
| Pulse Store | `@ion/pulse-store` | [store/ARCHITECTURE.md](ion/pulse/store/ARCHITECTURE.md) |
| Pulse Vault | `@ion/pulse-vault` | [vault/ARCHITECTURE.md](ion/pulse/vault/ARCHITECTURE.md) |
| Pulse Signal | `@ion/pulse-signal` | [signal/ARCHITECTURE.md](ion/pulse/signal/ARCHITECTURE.md) |
| Pulse Shard | `@ion/pulse-shard` | [shard/ARCHITECTURE.md](ion/pulse/shard/ARCHITECTURE.md) |
| Pulse Reaper | `@ion/pulse-reaper` | [reaper/ARCHITECTURE.md](ion/pulse/reaper/ARCHITECTURE.md) |
| Pulse Lens | `@ion/pulse-lens` | [lens/ARCHITECTURE.md](ion/pulse/lens/ARCHITECTURE.md) |
| Pulse Aggregate | `@ion/pulse-aggregate` | [aggregate/ARCHITECTURE.md](ion/pulse/aggregate/ARCHITECTURE.md) |
| Pulse Cache | `@ion/pulse-cache` | [cache/ARCHITECTURE.md](ion/pulse/cache/ARCHITECTURE.md) |
| Pulse Bench | `@ion/pulse-bench` | [bench/ARCHITECTURE.md](ion/pulse/bench/ARCHITECTURE.md) |

## Dependency Flow

Pulse Graph + Pulse Sync + Pulse Mesh + Pulse Signal + Pulse Vault run on ALL platforms (server, browser, mobile).

Server-only: Pulse Store (LMDB adapter), Pulse Shard, Pulse Reaper, Pulse Lens, Pulse Aggregate, Pulse Cache.

Client-only: Pulse Store (IndexedDB/SQLite adapters).

Pulse Bench is dev/test only.
