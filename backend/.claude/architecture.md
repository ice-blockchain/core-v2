# ION Architecture — Living Document

> This file describes the current state of the system. Updated after every structural PR.
> Last updated: 2026-03-27

---

## Repositories

| Repo | Purpose | Status |
|---|---|---|
| **ion-app** | React Native mobile app | Planning / Migration |
| **ion-backend** | All backend services | Planning / Migration |
| **@ion/api-contracts** | Shared typed API contracts | Planning |


---

## ion-backend Services

| Service | Purpose | Status | Architecture |
|---|---|---|---|
| greenfield-ingester | Subscribe to Greenfield blockchain events, enqueue to BullMQ Redis | Active | [ARCHITECTURE.md](../../services/greenfield-ingester/ARCHITECTURE.md) |
| identity | Auth, users, wallets | Planned | -- |
| wallet | Coin/NFT operations | Planned | -- |
| feed | Posts, likes, reposts | Planned | -- |
| chat | Messaging | Planned | -- |
| nft-minter | Minter | Planned | -- |
| token-analytics | Trades, holders, stats | Planned | -- |
| notifications | Push notification dispatch | Planned | -- |

---

## Packages

| Package | Purpose | Status | Architecture |
|---|---|---|---|
| greenfield-client | Go library for Greenfield RPC subscription and object download | Active | [ARCHITECTURE.md](../../packages/greenfield-client/ARCHITECTURE.md) |

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

---

## Known Deviations

_None yet. Document deviations from ideal architecture here with rationale._
