# Architecture Rules

## Two Repos. No More, No Less.

| Repo | Contains |
|---|---|
| **ion-app** | Mobile app, all internal packages |
| **ion-backend** | All backend services |

No package gets its own repo. No third repo "for shared stuff." The two repos are connected by typed API contracts.

See `.claude/architecture.md` for current tech stack, package list, and service list.

---

## ion-app: 6-Layer Hierarchy

```
App (screens)         <- New devs work here
  |
Actions (@ion/actions) <- The SDK: simple functions, simple types
  |
Features              <- push-notifications, deep-links, sharing
  |
Clients               <- identity-client, ion-connect-client, wallet-client, token-analytics-client
  |
Media                 <- media-acquisition, media-processing, media-upload, media-viewer, nsfw-detection, content-labeling
  |
Foundation            <- network, storage, config, diagnostics, permissions, platform, localization
```

### CRITICAL: Dependencies flow one direction only — downward.
A package can only import from layers below it. Never sideways. Never upward.

### Import Rules

| Layer | Can Import | Cannot Import |
|---|---|---|
| **Screens** | `@ion/actions` only (+ `@ion/media-viewer` for UI) | Everything else |
| **Actions** | Features, Clients, Media, Foundation | Other actions, screens |
| **Features** | Clients, Media, Foundation | Actions, screens, other features |
| **Clients** | Foundation | Everything above |
| **Media** | Foundation | Everything above |
| **Foundation** | External npm only | Any internal package |

Enforced by `eslint-plugin-boundaries` in CI.

---

## ion-backend: Service Layering

Every backend service follows this exact pattern:
```
routes -> controller -> service -> repository
                          |
                       shared/
```

| Layer | Responsibility | Can Import | Cannot Import |
|---|---|---|---|
| **Routes** | URL mapping, middleware assignment | Controller | Service, Repository, DB |
| **Controller** | Parse request, call service, format response. NO logic. | Service, Types | Repository, DB |
| **Service** | Business logic, orchestration, validation | Repository, Shared | Controller, Routes |
| **Repository** | Database queries ONLY. No business logic. | DB client, Types | Service, Controller |

### Backend directory structure
```
ion-backend/
  services/
    wallet/
      routes.ts
      controller.ts
      service.ts
      repository.ts
      types.ts
      validators.ts
      wallet.test.ts
    feed/
      ...same pattern...
    chat/
      ...same pattern...
  shared/
    auth/
    db/
    types/
      api-contracts/
    utils/
    middleware/
  config/
  CLAUDE.md
```

---

## Cross-Boundary Rules

### CRITICAL: Cross-service calls go through the service layer only.
If feed needs wallet data, it calls `WalletService.getBalance()`. It NEVER queries the wallet database directly.

### CRITICAL: All network calls go through `@ion/network`.
No raw `fetch()`, `XMLHttpRequest`, or direct WebSocket outside the network package. The network package handles auth headers, retries, timeouts, offline detection.

### CRITICAL: Typed API contracts between app and backend.
Every endpoint has typed request/response types in `@ion/api-contracts`. Both repos depend on this package. If the backend changes an API shape, the app must fail at compile time. No `any` on API boundaries.
