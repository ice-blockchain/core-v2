# @ion/network Architecture

Production-grade HTTP networking library. Provides type-safe HTTP client, bearer auth with token refresh, long-polling, offline request queuing, interceptor pipeline, and connection state management.

## Public API

```typescript
// Factories
export { createHttpClient }               // HTTP client with retry, interceptors, upload
export { createBearerAuthInterceptor }    // JWT auth with automatic token refresh
export { createRequestQueue }             // Offline request queue with replay
export { createLongPollClient }           // Long-polling with adaptive intervals
export { createConnectionStateMachine }   // Connection lifecycle state machine
export { createNetworkEventEmitter }      // Typed event emitter

// Error
export { NetworkError }                   // Custom error with code, status, retryAfterMs

// Types (30+ type exports)
export type { HttpClient, RequestOptions, Interceptor, TokenStorage, ... }
```

## Request Flow

```
1. Path param interpolation (:paramName -> value)
2. Body size validation (max 50 MB)
3. Request interceptor pipeline (forward order)
4. Axios request (timeout, headers, body, query)
5. Response parsing (strict JSON validation)
6. Response interceptor pipeline (reverse order)
7. Error status mapping -> NetworkError
8. Error interceptor pipeline
9. Retry with exponential backoff (if retryable)
10. Offline detection -> enqueue to RequestQueue (if enabled)
```

**Logging**: Request logging records method and URL only (`Logger.info`). Headers and body are never logged to prevent credential/PII leakage. Error responses (4xx+) are logged at `Logger.warning` level.

## Architecture

| Module | Responsibility |
|--------|---------------|
| `http-client.ts` | Core HTTP client. Wraps Axios with interceptors, retry, upload. |
| `interceptor-pipeline.ts` | Bidirectional interceptor execution (request forward, response reversed). |
| `bearer-auth-interceptor.ts` | Injects `Authorization` header. Handles 401 -> refresh -> retry. Single shared refresh promise. |
| `request-queue.ts` | Persists failed offline requests. Replays with backoff. Strips sensitive headers. |
| `long-poll-client.ts` | Cursor-based polling. Adaptive intervals based on activity and visibility. |
| `connection-state.ts` | State machine: idle -> connecting -> connected/disconnected -> reconnecting. |
| `network-event-emitter.ts` | Typed events: `auth-token-refreshed`, `auth-expired`, `online-state-changed`. |
| `https-validator.ts` | Blocks HTTP in production. Allows private IPs in development. |
| `network-error.ts` | Structured error with `NetworkErrorCode`, status, retryAfterMs. |
| `platform/network-state.*` | Web: `navigator.onLine` + visibility API. Native: `@react-native-community/netinfo`. |

## Bearer Auth Flow

```
Request -> inject Authorization header
  401 -> is this the refresh endpoint? -> yes: emit auth-expired, clear tokens
  401 -> not refresh endpoint -> acquire shared refresh promise -> refresh token
    -> success: emit auth-token-refreshed, retry original request
    -> failure: emit auth-expired, clear tokens
```

## Error Codes

`NETWORK_OFFLINE`, `NETWORK_TIMEOUT`, `REQUEST_ABORTED`, `SERVER_ERROR`, `CLIENT_ERROR`, `AUTH_EXPIRED`, `FORBIDDEN`, `RATE_LIMITED`, `PARSE_ERROR`, `HTTPS_REQUIRED`

## Defaults

| Setting | Value |
|---------|-------|
| Timeout | 30s |
| Max response size | 10 MB |
| Max request body | 50 MB |
| Retry attempts | 3 |
| Retry base delay | 200ms |
| Retry max delay | 10s |
| Long-poll max interval | 30s |
| Long-poll background interval | 60s |

## Design Decisions

- **Factory functions**: Clean interfaces, encapsulated state, easy testing.
- **Interceptor pipeline**: Composable, bidirectional. Named for debugging.
- **Single refresh promise**: Prevents concurrent token refresh race conditions.
- **Offline queue strips auth headers**: Security -- stored requests don't retain credentials.
- **HTTPS enforcement**: Production rejects all HTTP. Dev allows private IPs only.
- **Adaptive polling**: Backs off when idle, slows in background, responds to network changes.
- **Rate limit awareness**: Respects `Retry-After` header (seconds or HTTP-date).

## Dependencies

- **Runtime**: `axios`, `axios-retry`, `@ion/diagnostics`
- **Peer deps**: `@react-native-community/netinfo` (optional)
- **Downstream**: `@ion/diagnostics` (foundation)
- **Upstream consumers**: All clients, actions, app shells

## File Structure

```
src/
  index.ts
  http-client.ts                    # Core HTTP client
  http-types.ts
  network-error.ts
  shared-types.ts                   # ConnectionState, NetworkErrorCode, UploadProgress
  event-types.ts
  network-event-emitter.ts
  connection-state.ts               # State machine
  interceptor-types.ts
  interceptor-pipeline.ts
  bearer-auth-interceptor.ts
  auth-types.ts
  request-queue.ts
  queue-types.ts
  long-poll-client.ts
  long-poll-types.ts
  url-builder.ts                    # Path param interpolation
  https-validator.ts
  retry-types.ts
  platform/
    network-state.{ts,web.ts,native.ts}
  *.test.ts
```
