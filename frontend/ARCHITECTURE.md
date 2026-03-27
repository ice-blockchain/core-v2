# ION Frontend Architecture

Top-level index for the ION frontend monorepo. Each package has its own `ARCHITECTURE.md` with implementation details.

## Monorepo Structure

```
frontend/
  apps/
    mobile/     # React Native 0.84 (bare, New Architecture, Hermes)
    web/        # React 19 + Vite SPA (react-native-web)
  packages/     # Shared TypeScript packages
```

**Tooling**: pnpm workspaces + Turborepo. Node >= 20.

## Package Layer Map

Dependencies flow downward only. No sideways or upward imports.

```
Apps (mobile, web)
  |
UI Packages (auth-ui, onboarding-ui)
  |
Actions (onboarding)
  |
Clients (ion-connect-client)
  |
Media (media, media-viewer)
  |
Foundation (config, diagnostics, network, permissions, platform, storage, ui)
```

## Packages

### Foundation Layer

| Package | Description | Architecture |
|---------|-------------|-------------|
| [@ion/config](packages/config/) | Environment configuration (staging/testnet/production) with platform-specific loading and fail-fast validation | [ARCHITECTURE.md](packages/config/ARCHITECTURE.md) |
| [@ion/diagnostics](packages/diagnostics/) | Logging, error reporting, Sentry integration, ring buffer, global error capture | [ARCHITECTURE.md](packages/diagnostics/ARCHITECTURE.md) |
| [@ion/network](packages/network/) | HTTP client, bearer auth with token refresh, long-polling, offline queue, interceptor pipeline | [ARCHITECTURE.md](packages/network/ARCHITECTURE.md) |
| [@ion/storage](packages/storage/) | Key-value (MMKV/localStorage), secure (Keychain/Web Crypto), SQLite, in-memory LRU cache | [ARCHITECTURE.md](packages/storage/ARCHITECTURE.md) |
| [@ion/platform](packages/platform/) | Device info, identity, app lifecycle, screen dimensions, safe area, keyboard, install referrer | [ARCHITECTURE.md](packages/platform/ARCHITECTURE.md) |
| [@ion/permissions](packages/permissions/) | Unified permission management for camera, photos, microphone, notifications across platforms | [ARCHITECTURE.md](packages/permissions/ARCHITECTURE.md) |
| [@ion/ui](packages/ui/) | Design system: components, tokens, theming, icons, responsive scaling | [ARCHITECTURE.md](packages/ui/ARCHITECTURE.md) |

### Media Layer

| Package | Description | Architecture |
|---------|-------------|-------------|
| [@ion/media](packages/media/) | Media processing (compression, cropping, blurhash) and acquisition (picker, camera, metadata) | [ARCHITECTURE.md](packages/media/ARCHITECTURE.md) |
| [@ion/media-viewer](packages/media-viewer/) | Image/video display components with fullscreen viewing, pinch-to-zoom, dismiss gestures | [ARCHITECTURE.md](packages/media-viewer/ARCHITECTURE.md) |

### Client Layer

| Package | Description | Architecture |
|---------|-------------|-------------|
| [@ion/ion-connect-client](packages/ion-connect-client/) | Nostr event storage and querying with SQLite, replaceable events, FTS, tag filtering | [ARCHITECTURE.md](packages/ion-connect-client/ARCHITECTURE.md) |

### Action Layer

| Package | Description | Architecture |
|---------|-------------|-------------|
| [@ion/onboarding](packages/onboarding/) | Onboarding action stubs: profile save, avatar upload, nickname/referral validation | [ARCHITECTURE.md](packages/onboarding/ARCHITECTURE.md) |

### UI Feature Packages

| Package | Description | Architecture |
|---------|-------------|-------------|
| [@ion/auth-ui](packages/auth-ui/) | Authentication screens: registration, passkey verification, password verification | [ARCHITECTURE.md](packages/auth-ui/ARCHITECTURE.md) |
| [@ion/onboarding-ui](packages/onboarding-ui/) | Onboarding screens: profile setup, language selection, creator discovery, notifications | [ARCHITECTURE.md](packages/onboarding-ui/ARCHITECTURE.md) |

## Cross-Cutting Patterns

- **Platform resolution**: `.native.ts` / `.web.ts` suffixes. Base `.ts` stubs throw at runtime. Bundler (Metro/Vite) resolves.
- **Factory functions**: `createXxx()` pattern for stateful modules (storage, network, permissions).
- **All network through `@ion/network`**: No raw `fetch()` or `XMLHttpRequest` outside the network package.
- **Typed contracts**: TypeScript interfaces define boundaries between layers.

## Apps

### mobile (`apps/mobile/`)
React Native 0.84 with New Architecture and Hermes. iOS via Fastlane + xcconfig. Android via Gradle product flavors. Three environment schemes: staging, testnet, production.

### web (`apps/web/`)
React 19 SPA with Vite. Shares UI components via `react-native-web`.

## Related Docs

- [Developer Rules](CLAUDE.md) -- Size limits, naming, testing, security, git workflow
- [Detailed Architecture](.claude/architecture.md) -- Migration phases, architectural decisions, rationale
- [Coding Rules](.claude/rules/) -- Comprehensive rule documentation with examples
