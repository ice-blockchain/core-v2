# @ion/diagnostics Architecture

Unified logging and error reporting system. Provides severity-based logging, in-memory log buffering, Sentry integration, and global error capture.

## Public API

```typescript
export { Logger }       // Singleton: initialize, debug, info, warning, error, fatal, addBreadcrumb, setUser, clearUser, getBuffer
export { LogBuffer }    // Ring buffer for log entries
export { LogLevel }     // Enum: Debug=0, Info=1, Warning=2, Error=3, Fatal=4
export type { LogEntry, DiagnosticsConfig, Breadcrumb }
```

## Data Structures

```typescript
enum LogLevel { Debug = 0, Info = 1, Warning = 2, Error = 3, Fatal = 4 }

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  tag?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

interface DiagnosticsConfig {
  consoleLevel?: LogLevel;        // Default: Debug (dev), Warning (prod)
  sentryLevel?: LogLevel;         // Default: Error
  bufferCapacity?: number;        // Default: 100,000
  sentry?: Record<string, unknown>;
  captureGlobalErrors?: boolean;  // Default: true
}
```

## Log Flow

```
Logger.error(message, opts)
  -> createLogEntry()
  -> LogBuffer.add(entry)
  -> ConsoleTransport (if level >= consoleLevel)
  -> SentryTransport (if level >= sentryLevel AND passes event filter)
```

## Architecture

| Module | Responsibility |
|--------|---------------|
| `logger.ts` | Singleton orchestrator. Routes entries to buffer + transports. |
| `log-buffer.ts` | Fixed-capacity ring buffer (FIFO). Wraps on overflow. |
| `console-transport.ts` | Formats and outputs to `console.*` methods. |
| `sentry-transport.ts` | Sends to Sentry via injected module. Maps levels to Sentry severity. |
| `event-filter.ts` | Filters transient network errors (`ECONNREFUSED`, `ETIMEDOUT`, etc.) from Sentry. |
| `global-error-handler.ts` | Captures uncaught exceptions via `ErrorUtils` (RN) and `unhandledrejection` (web). |

## Design Decisions

- **Zero runtime deps**: Self-contained. Sentry is injected via config, not imported.
- **Transport separation**: Console and Sentry thresholds are independent.
- **Network noise filtering**: Transient network errors are suppressed from Sentry to reduce alert fatigue.
- **Cross-platform**: Detects `__DEV__`, `ErrorUtils`, and `globalThis.addEventListener` for environment.
- **Ring buffer**: Fixed capacity prevents unbounded memory growth. Default 100k entries.

## Dependencies

- **Downstream**: None (foundation layer)
- **Upstream consumers**: `@ion/network`, actions, app shells

## File Structure

```
src/
  index.ts                      # Public exports
  types.ts                      # LogEntry, DiagnosticsConfig, Breadcrumb
  logger.ts                     # Singleton Logger
  log-buffer.ts                 # Ring buffer
  log-entry.ts                  # Entry factory
  log-level.ts                  # Level labels and comparison
  console-transport.ts          # Console output
  sentry-transport.ts           # Sentry integration
  event-filter.ts               # Network error filtering
  global-error-handler.ts       # Uncaught exception capture
  globals.d.ts                  # Global type declarations
  *.test.ts                     # Colocated tests for each module
```
