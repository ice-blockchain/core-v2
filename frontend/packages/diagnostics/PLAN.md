# @ion/diagnostics — Implementation Plan

## Context

`@ion/diagnostics` is a Foundation layer package for the ION React Native app. It provides unified logging (console + remote) and crash reporting through a single `Logger` interface that routes internally to both a console transport (dev) and Sentry (production).

---

## File Structure

```
packages/diagnostics/
  src/
    types.ts                      # Enums, interfaces, config types
    log-level.ts                  # Level comparison utility
    log-level.test.ts
    log-entry.ts                  # Entry creation factory
    log-entry.test.ts
    log-buffer.ts                 # Circular in-memory buffer
    log-buffer.test.ts
    console-transport.ts          # Console output (dev)
    console-transport.test.ts
    sentry-transport.ts           # Sentry SDK integration
    sentry-transport.test.ts
    event-filter.ts               # Network error filtering
    event-filter.test.ts
    global-error-handler.ts       # ErrorUtils + promise rejection
    global-error-handler.test.ts
    logger.ts                     # Unified public API (orchestrator)
    logger.test.ts
  index.ts                        # Public API re-exports
  package.json
  tsconfig.json
```

---

## Public API

```typescript
// index.ts exports:
export { Logger } from "./logger";
export { LogBuffer } from "./log-buffer";
export { LogLevel } from "./types";
export type { LogEntry, DiagnosticsConfig, SentryTransportConfig, Breadcrumb } from "./types";
```

### Logger (primary interface)

```typescript
Logger.initialize(config: DiagnosticsConfig): void
Logger.debug(message, options?: { tag?; data? }): void
Logger.info(message, options?: { tag?; data? }): void
Logger.warning(message, options?: { tag?; data? }): void
Logger.error(message, options?: { tag?; data?; error? }): void
Logger.fatal(message, options?: { tag?; data?; error? }): void
Logger.addBreadcrumb(breadcrumb: Breadcrumb): void
Logger.setUser(userId: string): void
Logger.clearUser(): void
Logger.getBuffer(): LogBuffer
```

Each log method: creates entry -> adds to buffer -> sends to console transport -> sends to sentry transport (if configured + level meets threshold).

---

## Key Types

```typescript
enum LogLevel { Debug = 0, Info = 1, Warning = 2, Error = 3, Fatal = 4 }

interface DiagnosticsConfig {
  consoleLevel?: LogLevel;        // Default: Debug in __DEV__, Warning in prod
  sentryLevel?: LogLevel;         // Default: Error
  bufferCapacity?: number;        // Default: 100_000
  sentry?: SentryTransportConfig; // Omit to disable Sentry
  captureGlobalErrors?: boolean;  // Default: true
}

interface SentryTransportConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate?: number;      // Default: 1.0
  enablePerformanceTracing?: boolean;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  tag?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

interface Breadcrumb {
  message: string;
  category?: string;
  level?: LogLevel;
  data?: Record<string, unknown>;
}
```

---

## Internal Components

### `log-buffer.ts` — Circular in-memory buffer
- `LogBuffer` class with configurable capacity (default 100K)
- O(1) insert, overwrites oldest when full
- `getEntries()` returns ordered copy (oldest to newest)
- `getEntriesByLevel(level)` for filtered reads
- Exposed publicly for debug viewer screens

### `console-transport.ts` — Dev console output
- Maps LogLevel to `console.debug/info/warn/error`
- Formats: `[LEVEL] [tag?] message {data?}`
- Respects minimum level threshold
- Active in `__DEV__`, suppressed in production by default

### `sentry-transport.ts` — Remote crash reporting
- Wraps `@sentry/react-native` (optional peer dependency)
- `initialize()` calls `Sentry.init()` with DSN, sampling config
- Entries with `.error` -> `Sentry.captureException()`
- Entries without `.error` -> `Sentry.captureMessage()`
- Adds tags from `entry.tag` as `manual_log` tag
- Adds `entry.data` as `debug_context`
- Uses `event-filter.ts` internally to drop noise
- `setUserScope(id)` / `clearUserScope()` for user identification

### `event-filter.ts` — Network error filtering
Drops transient network errors that are not actionable:
- `network request failed`, `timeout exceeded`, `ECONNREFUSED`
- `ENOTFOUND`, `ETIMEDOUT`, `ENETUNREACH`, `socket hang up`

Keeps: HTTP 4xx/5xx errors, Fatal-level entries, manually tagged events.

### `global-error-handler.ts` — Unhandled error capture
- `ErrorUtils.setGlobalHandler()` for uncaught JS exceptions
- Promise rejection tracking via `promise/setimmediate/rejection-tracking`
- Chains with previous handler (does not destroy existing)
- Routes errors to `Logger.fatal()`

---

## Dependencies

```json
{
  "peerDependencies": {
    "@sentry/react-native": ">=6",
    "react-native": ">=0.76"
  },
  "peerDependenciesMeta": {
    "@sentry/react-native": { "optional": true }
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

Sentry is optional — package works for console-only logging without it.

---

## Consumer Usage

```typescript
// App entry point
import { Logger, LogLevel } from "@ion/diagnostics";

Logger.initialize({
  consoleLevel: __DEV__ ? LogLevel.Debug : LogLevel.Warning,
  sentryLevel: LogLevel.Error,
  sentry: __DEV__ ? undefined : {
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    release: "1.0.0",
  },
});

// In any module
Logger.error("Transfer failed", {
  tag: "wallet",
  error: caughtError,
  data: { userId, amount, coinId },
});

// Auth flow
Logger.setUser(authenticatedUser.publicKey);

// Breadcrumbs for flow tracking
Logger.addBreadcrumb({ message: "Started recovery flow", category: "auth" });
```

---

## Implementation Order

1. `types.ts` — zero dependencies
2. `log-level.ts` + `log-entry.ts` — pure functions
3. `log-buffer.ts` — depends on types only
4. `console-transport.ts` — depends on types + log-level
5. `event-filter.ts` — depends on types + log-level
6. `sentry-transport.ts` — depends on types + event-filter
7. `global-error-handler.ts` — standalone
8. `logger.ts` — orchestrator, wires everything
9. `index.ts` — re-exports
10. Test files alongside each source file

---

## Verification

1. **Type check:** `pnpm --filter @ion/diagnostics type-check`
2. **Lint:** `pnpm --filter @ion/diagnostics lint`
3. **Manual test:** Import from `@ion/web` or a test script, call `Logger.initialize()` + `Logger.info("test")`, verify console output
4. **Buffer test:** Call `Logger.getBuffer().getEntries()` after logging, verify entries present
5. **Sentry test:** Initialize with a test DSN, trigger `Logger.error()`, verify event appears in Sentry dashboard (production only)

---

## Architecture Doc Update

After implementation, update `.claude/architecture.md`:
- Change `@ion/diagnostics` status from `Planned` to `Implemented`

