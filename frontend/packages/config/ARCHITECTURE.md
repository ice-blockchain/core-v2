# @ion/config Architecture

Typed environment configuration manager and remote config service. Loads, validates, and exposes a singleton `EnvironmentConfig` for the entire application. Provides a generic, type-safe remote configuration client with multi-layer caching and version-aware conditional fetching.

## Public API

```typescript
// Environment config
export { environmentConfig } from './src/environment/environment';
export type { AppEnvironment, EnvironmentConfig, LogLevel } from './src/environment/types';

// Remote config
export { createRemoteConfig } from './src/remote-config/create-remote-config';
export { ConfigError, ConfigErrorCode } from './src/remote-config/remote-config-error';
export type {
  RemoteConfigService, RemoteConfigOptions, GetConfigOptions,
  AppConfigWithVersion,
} from './src/remote-config/remote-config-types';
```

## Data Structures

```typescript
type AppEnvironment = 'staging' | 'testnet' | 'production';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface EnvironmentConfig {
  appEnvironment: AppEnvironment;
  apiBaseUrl: string;    // Must be https://
  relayUrl: string;      // Must be wss://
  logLevel: LogLevel;
}
```

## Platform Resolution

| File | Platform | Source |
|------|----------|--------|
| `environment/environment.native.ts` | React Native | `react-native-config` (`APP_ENV`, `API_BASE_URL`, `RELAY_URL`, `LOG_LEVEL`) |
| `environment/environment.web.ts` | Web (Vite) | `process.env` (`VITE_APP_ENV`, `VITE_API_BASE_URL`, `VITE_RELAY_URL`, `VITE_LOG_LEVEL`) |
| `environment/environment.ts` | Stub | Throws at runtime -- bundler must resolve `.native` or `.web` |

Both platforms share `validateEnvironmentConfig()` which enforces:
- All 4 keys present
- Enum membership for `appEnvironment` and `logLevel`
- Valid URL format via `new URL()`
- `https://` protocol for API, `wss://` for relay

## Remote Config

### Overview

`createRemoteConfig<T>(options)` returns a typed `RemoteConfigService<T>` bound to a single config name. It fetches from `GET {baseUrl}/v1/config/{configName}` with caching, version-aware conditional fetching, and a 5-step fallback chain.

### Dependencies

- **`@ion/network`** — `HttpClient.getRaw()` for raw response access (status, headers, body). Optional — defaults to `createHttpClient({ baseUrl: environmentConfig.apiBaseUrl })`
- **`@ion/storage`** — `IKeyValueStorage` for persistent cache. Optional — defaults to `createKeyValueStorage({ id: 'remote-config' })`
- **`@ion/diagnostics`** — `Logger` for error/warning logging on cache and network failures

```typescript
// Minimal — uses default httpClient and storage
const multiswap = createRemoteConfig({
  configName: 'multiswap',
  parser: (raw) => JSON.parse(raw) as MultiswapConfig,
  checkVersion: true,
});

const config = await multiswap.getConfig();

// Custom dependencies
const service = createRemoteConfig({
  configName: 'feature-flags',
  parser: (raw) => JSON.parse(raw) as FeatureFlags,
  httpClient: customHttpClient,
  storage: customStorage,
  timeToLiveMs: 60_000,
});

const flags = await service.getConfig({ timeToLiveMs: 10_000 });
```

### Fallback Chain

```
1. Fresh cache (memory -> storage, respecting TTL)
2. Network fetch (with ?version= if checkVersion)
   - 200 -> parse, save, return
   - 204 -> continue to step 3
3. Stale cache (ignore TTL, refresh timestamp)
4. Force fetch (?version=0)
5. Throw CONFIG_NOT_FOUND
```

### Concurrency

Per-config-name mutex serializes concurrent `getConfig` calls. Each `RemoteConfigService<T>` instance is bound to one config name.

### Cache Storage Keys

- `remote_config:data:{configName}` -- raw string body
- `remote_config:version:{configName}` -- version number
- `remote_config:timestamp:{configName}` -- last sync timestamp (ms)

### Version Tracking

When `checkVersion = true`, the service sends `?version={cachedVersion}` and expects either an `x-version` response header or a `.version` field on the parsed result. A 204 response means "no update since your version."

## Design Decisions

- **Fail-fast**: Environment config validates at import time. Invalid config crashes the app before any logic runs.
- **Singleton**: `environmentConfig` is created once on module load -- no runtime re-reads.
- **Shared validation**: One `validateEnvironmentConfig()` function used by both platforms.
- **Peer deps only for env config**: `react-native-config` is optional.
- **`getRaw` on HttpClient**: Remote config uses `HttpClient.getRaw()` which returns raw status, headers, and body string -- unlike `get<T>()` which parses JSON.
- **Defaults for httpClient and storage**: Both are optional. When omitted, the service creates an `HttpClient` using `environmentConfig.apiBaseUrl` and a `KeyValueStorage` with id `remote-config`.
- **One service per config**: Each `createRemoteConfig` call binds `configName`, `parser`, and `checkVersion` at creation time. Consumers call `getConfig()` with no args (or an optional `timeToLiveMs` override).

## Dependencies

- **Downstream**: `@ion/network`, `@ion/storage`, `@ion/diagnostics`
- **Upstream consumers**: app shells

## File Structure

```
src/
  environment/
    types.ts                      # AppEnvironment, EnvironmentConfig, LogLevel
    environment.ts                # Stub (bundler resolves .web/.native)
    environment.web.ts            # Vite env vars
    environment.native.ts         # react-native-config
    validate-environment.ts       # Shared validation logic
    validate-environment.test.ts
    environment.test.ts
    environment.web.test.ts
  remote-config/
    remote-config-types.ts        # All interfaces and types
    remote-config-error.ts        # ConfigError, ConfigErrorCode
    config-mutex.ts               # Per-key promise serialization
    config-cache.ts               # Cache read/write/expiry helpers
    read-cached-config.ts         # Step 1: fresh cache lookup
    fetch-config-from-network.ts  # Step 2: network fetch + 200/204 handling
    read-stale-cache.ts           # Step 3: stale fallback (ignore TTL)
    force-fetch-config.ts         # Step 4: force fetch with version=0
    create-remote-config.ts       # Factory + orchestrator
```
