# ION Architecture — Living Document

> This file describes the current state of the system. Updated after every structural PR.
> Last updated: 2026-04-06

---

## Repositories

| Repo | Purpose | Status |
|---|---|---|
| **ion-app** | React Native mobile app | Planning / Migration |
| **ion-backend** | All backend services | Active |


---

## ion-backend Services

| Service | Purpose | Status | Architecture |
|---|---|---|---|
| greenfield-ingester | Subscribe to Greenfield blockchain events, enqueue to BullMQ Redis | Active | [ARCHITECTURE.md](../../services/greenfield-ingester/ARCHITECTURE.md) |
| ion-connect-storage | Virtual TON Storage node serving files from Greenfield. ADNL/RLDP, DHT registration, bag indexing, segment caching, TON Storage RPC, HTTP-over-RLDP provider index, health/metrics, CRDT cluster management with bag ownership, piece forwarding, dead node reclamation | Active (Phase 8) | [ARCHITECTURE.md](../../services/ion-connect-storage/ARCHITECTURE.md) |
| greenfield-processor | Download from Greenfield SP, upload to Bunny CDN | Active | [ARCHITECTURE.md](../../services/greenfield-processor/ARCHITECTURE.md) |
| identity | Auth, users, wallets | Planned | -- |
| wallet | Coin/NFT operations | Planned | -- |
| feed | Posts, likes, reposts (Fastify, healthcheck endpoint live) | Scaffolded | -- |
| chat | Messaging | Planned | -- |
| nft-minter | Minter | Placeholder (.gitkeep only) | -- |
| token-analytics | Trades, holders, stats | Planned | -- |
| notifications | Push notification dispatch | Planned | -- |

---

## Packages

| Package | Purpose | Status | Architecture |
|---|---|---|---|
| api-contracts | Shared typed API request/response schemas (used by feed service and future services) | Active | -- |
| greenfield-client | Go library for Greenfield RPC subscription, object download, event parsing (shared by ingester + storage) | Active | [ARCHITECTURE.md](../../packages/greenfield-client/ARCHITECTURE.md) |

---

## Migration Status

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Scaffold repos, workspaces, CI, CLAUDE.md | Not started |
| Phase 1 | Foundation packages | Not started |
| Phase 2 | Clients + API contracts | Not started |
| Phase 3 | Media pipeline | Not started |
| Phase 4 | Feature packages | Not started |
| Phase 5 | App shell + screens | Not started |
| Phase 6 | Backend migration | Not started |

---

## Key Architectural Decisions

| Decision | Rationale | Date |
|---|---|---|
| Two repos (app + backend) | Different build systems, deploy cycles, CI complexity | 2026-03-20 |
| Monorepo for app packages | Shared code, atomic changes, AI searchability | 2026-03-20 |
| Actions layer as internal SDK | New dev productivity, clean separation of concerns | 2026-03-20 |
| React Native (from Flutter) | AI training data, TypeScript type safety, shared types with backend | 2026-03-20 |
| MMKV + SQLite for storage | MMKV for fast key-value, SQLite for structured/relational data | 2026-03-20 |
| Go for Greenfield integration | Greenfield SDK is Go-native; avoids FFI/serialization overhead | 2026-03-27 |
| BullMQ Redis as event bridge | Go ingester writes BullMQ-compatible jobs; Node.js workers consume them | 2026-03-27 |
| Open cluster overlay participation | ADNL authenticates peers via ed25519; overlay carries only public bag metadata; no application-level ACL needed | 2026-04-06 |
| NodeID derived from ADNL key | Prevents identity spoofing; NODE_ID env var removed; nodeID is always hex-encoded ADNL address | 2026-04-06 |
| Post-claim convergence verification | Prevents TOCTOU split-brain in bag ownership; 3 reads with exponential backoff after CRDT claim | 2026-04-06 |

---

## Known Deviations

_None yet. Document deviations from ideal architecture here with rationale._
