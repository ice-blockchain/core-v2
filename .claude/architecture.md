# ION Architecture — Living Document

> This file describes the current state of the system. Updated after every structural PR.
> Last updated: 2026-03-27

---

## Workspace Structure

This is a monorepo. Frontend, backend, and shared packages live in the same repository.

| Directory | Purpose | Architecture File | Status |
|---|---|---|---|
| **frontend/** | React Native mobile app (ion-app) | [frontend/.claude/architecture.md](../frontend/.claude/architecture.md) | Planning / Migration |
| **backend/** | All backend services (ion-backend) | [backend/architecture.md](../backend/architecture.md) | Planning / Migration |
| **shared/** | Cross-platform packages (Pulse framework) | [shared/ARCHITECTURE.md](../shared/ARCHITECTURE.md) | In Progress |
| **@ion/api-contracts** | Shared typed API contracts | — | Planning |

---

## Shared Packages — ION Pulse (`shared/pulse/`)

ION Pulse is a decentralized relay server framework written in Rust. Deploys as a single binary with all storage engines embedded. Provides multi-tenant DB-as-a-Service with Ed25519-signed event verification, hybrid sharding, and federated global queries.

**Language:** Rust (async via tokio) + embedded C/C++ (LMDB, DuckDB, libsodium)

> Full details: [shared/ARCHITECTURE.md](../shared/ARCHITECTURE.md) and [shared/pulse/ARCHITECTURE.md](../shared/pulse/ARCHITECTURE.md)

| Crate | Path | Architecture | Purpose | Status |
|---|---|---|---|---|
| `pulse-types` | `shared/pulse/types/` | — | SignedEvent, kind routing, shared error types | Implemented |
| `pulse-auth` | `shared/pulse/auth/` | [ARCHITECTURE.md](../shared/pulse/auth/ARCHITECTURE.md) | Ed25519 verification (libsodium), SHA-256 event ID, TON address, rate limiting (governor) | Implemented |
| `pulse-transport` | `shared/pulse/transport/` | [ARCHITECTURE.md](../shared/pulse/transport/ARCHITECTURE.md) | WebTransport server (wtransport), ADNL bridge (everscale-network), HTTP/1.1 fallback (hyper) | Implemented |
| `pulse-graph` | `shared/pulse/graph/` | [ARCHITECTURE.md](../shared/pulse/graph/ARCHITECTURE.md) | Graph store on LMDB (events, nodes, edges, timeline, by_kind) | Implemented |
| `pulse-kv` | `shared/pulse/kv/` | [ARCHITECTURE.md](../shared/pulse/kv/ARCHITECTURE.md) | Fast KV store on LMDB (user_kv, kv_meta) | Implemented |
| `pulse-vector` | `shared/pulse/vector/` | [ARCHITECTURE.md](../shared/pulse/vector/ARCHITECTURE.md) | ANN vector search on Lance | Implemented |
| `pulse-analytics` | `shared/pulse/analytics/` | [ARCHITECTURE.md](../shared/pulse/analytics/ARCHITECTURE.md) | Columnar analytics on DuckDB (count, timeseries, rank) | Implemented |
| `pulse-sql` | `shared/pulse/sql/` | [ARCHITECTURE.md](../shared/pulse/sql/ARCHITECTURE.md) | SQL query API on DataFusion (tenant-scoped, multi-threaded) | Implemented |
| `pulse-schema` | `shared/pulse/schema/` | [ARCHITECTURE.md](../shared/pulse/schema/ARCHITECTURE.md) | Unified schema registry, validation, versioning, engine mappings | Implemented |
| `pulse-tenant` | `shared/pulse/tenant/` | [ARCHITECTURE.md](../shared/pulse/tenant/ARCHITECTURE.md) | Multi-tenant isolation, lifecycle, quotas, DB-as-a-Service | Implemented |
| `pulse-signal` | `shared/pulse/signal/` | [ARCHITECTURE.md](../shared/pulse/signal/ARCHITECTURE.md) | Real-time subscriptions via path trie (exact, wildcard, deep) | Implemented |
| `pulse-shard` | `shared/pulse/shard/` | [ARCHITECTURE.md](../shared/pulse/shard/ARCHITECTURE.md) | Consistent hash ring, min/max shard bounds, auto-repair, cleanup, rebalance | Implemented |
| `pulse-federation` | `shared/pulse/federation/` | [ARCHITECTURE.md](../shared/pulse/federation/ARCHITECTURE.md) | Scatter-gather coordinator for global queries, vector merge | Implemented |
| `pulse-reaper` | `shared/pulse/reaper/` | [ARCHITECTURE.md](../shared/pulse/reaper/ARCHITECTURE.md) | GC sweeps, tombstone TTL, GDPR erasure | Implemented |
| `pulse-relay` | `shared/pulse/relay/` | — | Single binary server, event pipeline, shard repair scheduler, config-driven | Implemented |
| `pulse-bench` | `shared/pulse/bench/` | [ARCHITECTURE.md](../shared/pulse/bench/ARCHITECTURE.md) | Benchmarking harness (criterion) | Implemented |

**Total: 16 Rust crates (14 libraries + 1 binary + 1 bench)**

### Client Outlines

| Platform | Path | Stack |
|---|---|---|
| Web | `shared/pulse/clients/web/` | WebTransport API + @noble/ed25519 + IndexedDB |
| Android | `shared/pulse/clients/mobile/` | Cronet + Tink + Room |
| iOS | `shared/pulse/clients/mobile/` | Network.framework + CryptoKit + SwiftData |
| Desktop | `shared/pulse/clients/desktop/` | Shared Rust crates (wtransport + sodiumoxide + heed) |

---

## Frontend Packages — ion-app (`frontend/`)

> Full details: [frontend/.claude/architecture.md](../frontend/.claude/architecture.md)

### Foundation Layer

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@ion/platform` | `frontend/packages/platform/` | Device ID, install referrer, OS info | Implemented |
| `@ion/storage` | `frontend/packages/storage/` | MMKV, SQLite, secure keychain | Implemented |
| `@ion/network` | `frontend/packages/network/` | HTTP, long polling, auth, retry, offline queue | Implemented |
| `@ion/diagnostics` | `frontend/packages/diagnostics/` | Sentry, on-device logs | Implemented |
| `@ion/permissions` | `frontend/packages/permissions/` | Camera, photos, microphone, notifications, cloud permissions | Implemented |
| `@ion/config` | `frontend/packages/config/` | Remote config, env, feature flags | Implemented |
| `@ion/localization` | — | i18n, plurals, fallback | Planned |
| `@ion/auth-ui` | `frontend/packages/auth-ui/` | Shared auth screens, forms, buttons, icons, validation | Implemented |
| `@ion/ui` | `frontend/packages/ui/` | Shared UI components | Implemented |

### Media Layer

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@ion/media-acquisition` | — | Picker, camera, metadata | Planned |
| `@ion/media-processing` | — | Crop, resize, blurhash, compress (image/video/audio/brotli) | Implemented |
| `@ion/media-upload` | — | Encrypt, chunk, retry, queue | Planned |
| `@ion/media-viewer` | `frontend/packages/media-viewer/` | Image, video, gif, fullscreen | Implemented |
| `@ion/nsfw-detection` | — | On-device safety checks | Planned |
| `@ion/content-labeling` | — | fastText language/category | Planned |

### Client Layer

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@ion/identity-client` | — | Auth, users API | Planned |
| `@ion/ion-connect-client` | `frontend/packages/ion-connect-client/` | Relays, events, NIPs, DVM | In Progress |
| `@ion/token-analytics-client` | — | Trades, holders, stats API | Planned |
| `@ion/wallet-client` | — | Coins, NFT sync, DFNS | Planned |

### Feature Layer

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@ion/push-notifications` | — | FCM, token, handlers | Planned |
| `@ion/deep-links` | — | AppsFlyer, navigation | Planned |
| `@ion/sharing` | — | OS share, OG metadata | Planned |

### Actions Layer

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@ion/actions` | — | Internal SDK — business functions for screens | Planned |

**Total: 24 packages (11 implemented, 1 in progress, 12 planned)**

---

## Backend Services — ion-backend (`backend/`)

> Full details: [backend/architecture.md](../backend/architecture.md)

| Service | Path | Purpose | Status |
|---|---|---|---|
| feed | `backend/services/feed/` | Posts, likes, reposts | In Progress |
| identity | — | Auth, users, wallets | Planned |
| wallet | — | Coin/NFT operations | Planned |
| chat | — | Messaging | Planned |
| token-analytics | — | Trades, holders, stats | Planned |
| notifications | — | Push notification dispatch | Planned |

**Total: 6 services (1 in progress, 5 planned)**

---

## Migration Status

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Scaffold repos, workspaces, CI, CLAUDE.md | Not started |
| Phase 1 | Foundation packages | Not started |
| Phase 2 | Clients + API contracts | Not started |
| Phase 3 | Media pipeline | In Progress |
| Phase 4 | Feature packages | Not started |
| Phase 5 | App shell + screens | Not started |
| Phase 6 | Backend migration | Not started |

---

## Key Architectural Decisions

| Decision | Rationale | Date |
|---|---|---|
| Monorepo (frontend + backend + shared) | Unified workspace, shared tooling, atomic cross-stack changes | 2026-03-26 |
| Monorepo for app packages | Shared code, atomic changes, AI searchability | 2026-03-20 |
| Actions layer as internal SDK | New dev productivity, clean separation of concerns | 2026-03-20 |
| React Native (from Flutter) | AI training data, TypeScript type safety, shared types with backend | 2026-03-20 |
| MMKV + SQLite for storage | MMKV for fast key-value, SQLite for structured/relational data | 2026-03-20 |
| react-native-web for shared UI | Auth UI package uses RN primitives, web consumes via react-native-web | 2026-03-25 |
| ION Pulse as shared framework | Cross-platform P2P graph DB usable by both frontend and backend | 2026-03-26 |
| Pulse Rust rewrite | Zero-cost C/C++ FFI, no GC, single binary relay, 50x crypto perf vs JS | 2026-03-27 |
| Embedded databases (LMDB, DuckDB, Lance) | Single binary deployment, no external DB dependencies | 2026-03-27 |
| Multi-tenant DB-as-a-Service | Isolated storage per tenant, independent quotas, lifecycle | 2026-03-27 |
| Unified schema registry | Per-kind schema definitions, hard-reject validation, engine mappings | 2026-03-27 |

---

## Known Deviations

_None yet. Document deviations from ideal architecture here with rationale._
