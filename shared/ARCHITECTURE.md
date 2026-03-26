# ION Pulse Architecture

ION Pulse (`@ion/pulse`) is a decentralized P2P offline-first graph database framework.

## Modules

| Module | Package | Purpose |
|---|---|---|
| [Pulse Graph](ion/pulse/graph/ARCHITECTURE.md) | `@ion/pulse-graph` | Graph data model, nodes, souls, links, queries |
| [Pulse Sync](ion/pulse/sync/ARCHITECTURE.md) | `@ion/pulse-sync` | CRDT merge engine via Yjs (Y.Map, Y.Doc) |
| [Pulse Mesh](ion/pulse/mesh/ARCHITECTURE.md) | `@ion/pulse-mesh` | P2P transport via libp2p (GossipSub, Circuit Relay, Kademlia) |
| [Pulse Store](ion/pulse/store/ARCHITECTURE.md) | `@ion/pulse-store` | Persistence adapters (LMDB, IndexedDB, SQLite) |
| [Pulse Vault](ion/pulse/vault/ARCHITECTURE.md) | `@ion/pulse-vault` | Cryptography (Ed25519, AES-GCM, X25519, scrypt) |
| [Pulse Signal](ion/pulse/signal/ARCHITECTURE.md) | `@ion/pulse-signal` | Real-time subscriptions with path matching and wildcards |
| [Pulse Shard](ion/pulse/shard/ARCHITECTURE.md) | `@ion/pulse-shard` | Consistent hashing ring for shard routing and replica management |
| [Pulse Reaper](ion/pulse/reaper/ARCHITECTURE.md) | `@ion/pulse-reaper` | Garbage collection, TTL expiry, GDPR hard delete |
| [Pulse Lens](ion/pulse/lens/ARCHITECTURE.md) | `@ion/pulse-lens` | Semantic vector search via LanceDB |
| [Pulse Aggregate](ion/pulse/aggregate/ARCHITECTURE.md) | `@ion/pulse-aggregate` | Analytical queries and federated scatter-gather via DuckDB |
| [Pulse Cache](ion/pulse/cache/ARCHITECTURE.md) | `@ion/pulse-cache` | Non-authoritative LRU cache with TTL for relay servers |
| [Pulse Bench](ion/pulse/bench/ARCHITECTURE.md) | `@ion/pulse-bench` | Benchmarking, multi-user emulation, Docker relay clusters |

## Data Flow

### Relay Server (Node.js)
```
Mesh (libp2p) -> Cache (LRU) -> Signal -> Sync (Yjs) -> Graph -> Store (LMDB)
                                                                    |
                                                          Shard (DHT ring)
                                                                    |
                                                          Reaper (GC/TTL)
                                                          Lens (LanceDB)
                                                          Aggregate (DuckDB)
```

### Client (Browser / React Native)
```
Mesh (libp2p) -> Signal -> Sync (Yjs) -> Graph -> Store (IndexedDB/SQLite)
```

## Key Principles
- All modules are independent sub-packages that can be consumed individually
- Server stores a shard of the graph; client stores only user's own data
- Both server and client are full P2P mesh participants
- Offline-first: Yjs Y.Doc captures writes locally, syncs on reconnect
- Dependencies flow downward only; no circular imports between modules
