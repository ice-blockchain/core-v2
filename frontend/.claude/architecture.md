# ION Architecture — Living Document

> This file describes the current state of the system. Updated after every structural PR.
> Last updated: 2026-03-30

---

## Repositories

| Repo | Purpose | Status |
|---|---|---|
| **ion-app** | React Native mobile app | Planning / Migration |
| **ion-backend** | All backend services | Planning / Migration |
| **@ion/api-contracts** | Shared typed API contracts | Planning |

---

## ion-app Packages

### Foundation Layer
| Package | Purpose | Status |
|---|---|---|
| `@ion/platform` | Device ID, install referrer, OS info | Planned |
| `@ion/storage` | MMKV, SQLite, secure keychain | Implemented |
| `@ion/network` | HTTP, long polling, auth, retry, offline queue | Implemented |
| `@ion/diagnostics` | Sentry, on-device logs | Implemented |
| `@ion/permissions` | Camera, photos, microphone, notifications, cloud permissions (iOS, Android, Web) | Implemented |
| `@ion/config` | Remote config, env, feature flags | Implemented |
| `@ion/localization` | i18n, plurals, fallback, device locale, language persistence | Implemented |
| `@ion/ion-connect-proxy` | ION Connect proxy lifecycle, proxy transport for .ton domains | Implemented |
| `@ion/ton-storage` | TON Storage daemon lifecycle, bag management client | Implemented |
| `@ion/file-storage` | File download orchestration (CDN + TON fallback), cache, queue | Implemented |
| `@ion/auth-ui` | Shared auth screens, forms, buttons, icons, validation | Implemented |

### Media Layer
| Package | Purpose | Status |
|---|---|---|
| `@ion/media-acquisition` | Picker, camera, metadata | Planned |
| `@ion/media-processing` | Crop, resize, blurhash, compress (image/video/audio/brotli) | Implemented |
| `@ion/media-upload` | Greenfield delegated upload, retry, queue | In Progress |
| `@ion/media-viewer` | Image, video, gif, fullscreen | Planned |
| `@ion/nsfw-detection` | On-device safety checks | Planned |
| `@ion/content-labeling` | fastText language/category | Planned |

### Client Layer
| Package | Purpose | Status |
|---|---|---|
| `@ion/identity-client` | Auth, users API | In Progress |
| `@ion/token-analytics-client` | Trades, holders, stats API | Planned |
| `@ion/wallet-client` | Coins, NFT sync, DFNS | Planned |

### Feature Layer
| Package | Purpose | Status |
|---|---|---|
| `@ion/push-notifications` | FCM, token, handlers | Planned |
| `@ion/deep-links` | AppsFlyer, navigation | Planned |
| `@ion/sharing` | OS share, OG metadata | Planned |

### Actions Layer
| Package | Purpose | Status |
|---|---|---|
| `@ion/auth` | Auth flow orchestrator | In Progress |
| `@ion/actions` | Internal SDK — business functions for screens | Planned |

**Total: 25 packages**

---

## ion-backend Services

| Service | Purpose | Status |
|---|---|---|
| identity | Auth, users, wallets | Planned |
| wallet | Coin/NFT operations | Planned |
| feed | Posts, likes, reposts | Planned |
| chat | Messaging | Planned |
| token-analytics | Trades, holders, stats | Planned |
| notifications | Push notification dispatch | Planned |

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
| Two repos (app + backend) | Different build systems, deploy cycles, CI complexity | 2026-03-20 |
| Monorepo for app packages | Shared code, atomic changes, AI searchability | 2026-03-20 |
| Actions layer as internal SDK | New dev productivity, clean separation of concerns | 2026-03-20 |
| React Native (from Flutter) | AI training data, TypeScript type safety, shared types with backend | 2026-03-20 |
| MMKV + SQLite for storage | MMKV for fast key-value, SQLite for structured/relational data | 2026-03-20 |
| react-native-web for shared UI | Auth UI package uses RN primitives, web consumes via react-native-web | 2026-03-25 |

---

## Known Deviations

_None yet. Document deviations from ideal architecture here with rationale._
