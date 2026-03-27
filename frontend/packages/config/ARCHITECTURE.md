# @ion/config Architecture

Typed environment configuration manager. Loads, validates, and exposes a singleton `EnvironmentConfig` for the entire application.

## Public API

```typescript
export { environmentConfig } from './src/environment';
export type { AppEnvironment, EnvironmentConfig, LogLevel } from './src/types';
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
| `environment.native.ts` | React Native | `react-native-config` (`APP_ENV`, `API_BASE_URL`, `RELAY_URL`, `LOG_LEVEL`) |
| `environment.web.ts` | Web (Vite) | `import.meta.env` (`VITE_APP_ENV`, `VITE_API_BASE_URL`, `VITE_RELAY_URL`, `VITE_LOG_LEVEL`) |
| `environment.ts` | Stub | Throws at runtime -- bundler must resolve `.native` or `.web` |

Both platforms share `validateEnvironmentConfig()` which enforces:
- All 4 keys present
- Enum membership for `appEnvironment` and `logLevel`
- Valid URL format via `new URL()`
- `https://` protocol for API, `wss://` for relay

## Design Decisions

- **Fail-fast**: Config validates at import time. Invalid config crashes the app before any logic runs.
- **Singleton**: `environmentConfig` is created once on module load -- no runtime re-reads.
- **Shared validation**: One `validateEnvironmentConfig()` function used by both platforms.
- **No runtime deps**: Zero production dependencies. Peer deps (`react-native-config`) are optional.

## Dependencies

- **Downstream**: None (foundation layer)
- **Upstream consumers**: `@ion/network`, `@ion/diagnostics`, app shells

## File Structure

```
src/
  types.ts                      # AppEnvironment, EnvironmentConfig, LogLevel
  environment.ts                # Stub (bundler resolves .web/.native)
  environment.web.ts            # Vite env vars
  environment.native.ts         # react-native-config
  validate-environment.ts       # Shared validation logic
  validate-environment.test.ts
  environment.test.ts
  environment.web.test.ts
```
