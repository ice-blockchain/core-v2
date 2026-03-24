# @ion/diagnostics

Foundation layer package providing unified logging and crash reporting. Platform-agnostic — works in both React Native (mobile) and React/Next.js (web).

## Setup

### React Native (mobile)

```typescript
import * as Sentry from "@sentry/react-native";
import { Logger, LogLevel } from "@ion/diagnostics";

// 1. Initialize Sentry with platform-specific config
Sentry.init({
  dsn: SENTRY_DSN,
  environment: "production",
  release: "1.0.0",
  tracesSampleRate: 1.0,
  enableAutoPerformanceTracing: true,
});

// 2. Initialize Logger, passing the Sentry module
Logger.initialize({
  consoleLevel: LogLevel.Debug,  // defaults: Debug in dev, Warning in prod
  sentryLevel: LogLevel.Error,   // only Error+ goes to Sentry
  sentry: Sentry,
});
```

### Next.js (web)

```typescript
// instrumentation.ts — Next.js initializes Sentry here
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// app entry — pass the same module to Logger
import { Logger } from "@ion/diagnostics";

Logger.initialize({ sentry: Sentry });
```

### Console-only (no Sentry)

```typescript
import { Logger } from "@ion/diagnostics";

Logger.initialize({});
// Logs go to console and in-memory buffer only
```

## API

### Logging

```typescript
Logger.debug("Cache hit", { tag: "storage", data: { key: "user_prefs" } });
Logger.info("User signed in", { tag: "auth" });
Logger.warning("Rate limit approaching", { tag: "network", data: { remaining: 5 } });
Logger.error("Transfer failed", {
  tag: "wallet",
  error: caughtError,
  data: { userId, amount, coinId },
});
Logger.fatal("Unrecoverable state", { error: caughtError });
```

Every call writes to the in-memory buffer and console. Entries at or above `sentryLevel` also go to Sentry (if configured).

### User scope

```typescript
// After authentication — tags all Sentry events with this user
Logger.setUser(authenticatedUser.publicKey);

// On sign out
Logger.clearUser();
```

### Breadcrumbs

```typescript
Logger.addBreadcrumb({
  message: "Started wallet recovery flow",
  category: "auth",
  data: { method: "seed_phrase" },
});
```

### Buffer access

```typescript
// Read all buffered entries (useful for debug screens)
const entries = Logger.getBuffer().getEntries();

// Filter by level
const errors = Logger.getBuffer().getEntriesByLevel(LogLevel.Error);

// Clear
Logger.getBuffer().clear();
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `consoleLevel` | `LogLevel` | `Debug` in dev, `Warning` in prod | Minimum level for console output |
| `sentryLevel` | `LogLevel` | `Error` | Minimum level for Sentry reporting |
| `bufferCapacity` | `number` | `100000` | Max entries in circular buffer |
| `sentry` | Sentry module | `undefined` | Pre-initialized Sentry SDK instance |
| `captureGlobalErrors` | `boolean` | `true` | Install global error + rejection handlers |

Dev detection: uses `__DEV__` (React Native) or `process.env.NODE_ENV` (Next.js).

## Log levels

| Level | Value | Console method | Sentry behavior |
|---|---|---|---|
| `Debug` | 0 | `console.debug` | Not sent |
| `Info` | 1 | `console.info` | Not sent (default) |
| `Warning` | 2 | `console.warn` | Not sent (default) |
| `Error` | 3 | `console.error` | `captureException` or `captureMessage` |
| `Fatal` | 4 | `console.error` | Always sent, bypasses network filter |

## Event filtering

Transient network errors are automatically dropped from Sentry to reduce noise:
`network request failed`, `timeout exceeded`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`, `ENETUNREACH`, `socket hang up`, `ECONNRESET`, `EPIPE`, `aborted`.

Exceptions: `Fatal` entries and entries tagged `manual_log` always go through.

## Usage in actions (error handling pattern)

```typescript
// Inside an action
import { Logger } from "@ion/diagnostics";

async function sendMessage(input: SendMessageInput) {
  try {
    const result = await IonConnectClient.publishEvent(event);
    return result;
  } catch (error) {
    Logger.error("Failed to send message", {
      tag: "messaging",
      error: error instanceof Error ? error : new Error(String(error)),
      data: { conversationId: input.conversationId },
    });
    throw new ActionError("MESSAGE_SEND_FAILED", "Could not send message.");
  }
}
```

## Security: PII and sensitive data

Never pass sensitive data (passwords, tokens, private keys, seeds) in `data` or `message` fields. Everything logged is sent to console in dev and potentially to Sentry in production. The package does not sanitize or redact — this is the caller's responsibility.

```typescript
// WRONG — leaks credentials
Logger.error("Auth failed", { data: { password: userPassword, token: authToken } });

// CORRECT — log context without secrets
Logger.error("Auth failed", { tag: "auth", data: { userId, reason: "invalid_credentials" } });
```

## Running checks

```bash
pnpm --filter @ion/diagnostics lint
pnpm --filter @ion/diagnostics type-check
pnpm --filter @ion/diagnostics test
```
