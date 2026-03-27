# ION BNB Greenfield Proxy — Implementation Plan

## Overview

The ION BNB Greenfield Proxy is a Go service that acts as a transparent reverse proxy between clients and the BNB Greenfield RPC/SP endpoints. Incoming requests are forwarded to the upstream Greenfield target as-is — the service does not inspect or rewrite request bodies. Its value is in the middleware layer: authentication, observability, rate limiting, CORS, and a pre-request fee guarantee hook that intercepts specific URL patterns and submits a `MsgGrantAllowance` on-chain before forwarding, ensuring the client can cover gas costs without holding the bucket owner's master key.

One class of requests is intercepted and answered locally rather than forwarded: `getSPUrlByBucket` queries. When the service detects this call, it returns its own ADNL address instead of the real SP URL. This ensures the client routes all subsequent SP traffic back through this service over the overlay — the client makes no direct connections to Greenfield at any point.

The service listens on two transports simultaneously: a standard HTTP/TCP socket bound to localhost for internal and development traffic, and an ADNL/RLDP address on the ION overlay network for production client traffic. Both transports feed into the same middleware and proxy handler. All components are wired together at startup using `uber-go/fx`.

---

## Architecture Context

```
Client App (overlay)
  └── ADNL/RLDP transport
        └── ION BNB Greenfield Proxy   ← this service
              ├── getSPUrlByBucket?  →  returns own ADNL address
              └── everything else    →  forwarded to Greenfield RPC / SP

Internal / Dev Client
  └── HTTP/TCP → localhost:PORT
        └── ION BNB Greenfield Proxy   ← same service
              ├── getSPUrlByBucket?  →  returns own ADNL address
              └── everything else    →  forwarded to Greenfield RPC / SP
```

The proxy does not own any Greenfield business logic except for two concerns: the fee guarantee hook (submits `MsgGrantAllowance` on pattern-matched URLs before forwarding) and the SP URL intercept (answers `getSPUrlByBucket` locally to keep the client entirely within the overlay). Every other request is forwarded as-is.

---

## Environment Variables

All variables are required at startup unless marked optional. The service validates the full configuration before any listener binds and exits with a descriptive error on the first missing or malformed value.

| Variable | Type | Description |
|---|---|---|
| `GREENFIELD_RPC_ENDPOINT` | URL | Upstream Greenfield RPC target to forward requests to |
| `GREENFIELD_SP_ENDPOINT` | URL | Upstream Greenfield SP target to forward requests to |
| `GREENFIELD_PRIVATE_KEY` | hex string (`0x`-prefixed) | Bucket owner's private key, used to sign fee grant transactions |
| `GREENFIELD_CHAIN_ID` | integer | Network chain ID |
| `GREENFIELD_FEE_GRANT_AMOUNT_BNB` | decimal string | BNB spend limit per fee grant. Optional — defaults to `"0.001"` |
| `PORT` | integer | Localhost HTTP port to bind (default: `3000`) |
| `METRICS_PORT` | integer | Port for the `/metrics` endpoint. Optional in `development` — if unset, metrics are served on `PORT` and a warning is logged at startup. Required in all other environments. |
| `ADNL_PRIVATE_KEY` | hex string | Ed25519 private key that defines the service's ADNL identity. Can also be supplied as the CLI flag `--adnl-key`. If both are present, the CLI flag takes precedence. |
| `DNS_PRIVATE_KEY` | hex string | Private key of the wallet holding the `.ion` domain NFT, used to sign the `changeRecord` transaction. Optional. Can also be supplied as the CLI flag `--dns-key`. If both are present, the CLI flag takes precedence. |
| `DNS_NAME` | string | The `.ion` domain name to register the service's ADNL address under (e.g. `myservice.ion`). Optional. Can also be supplied as the CLI flag `--dns-name`. |
| `LOG_LEVEL` | string | Log level: `debug`, `info`, `warn`, `error` (default: `info`) |
| `ENV` | string | Runtime environment: `development`, `production` (default: `production`) |

`MAX_UPLOAD_SIZE_BYTES` and `GREENFIELD_BUCKET_NAME` are removed — the proxy no longer owns upload logic or bucket management.

---

## Project Structure

```
ion-greenfield-proxy/
├── cmd/
│   └── server/
│       └── main.go                     # Entry point — builds fx.App, starts lifecycle
├── internal/
│   ├── config/
│   │   └── config.go                   # Env var + CLI flag parsing and validation
│   ├── fx/
│   │   └── modules.go                  # fx module groupings — one fx.Option per concern
│   ├── middleware/
│   │   ├── auth.go                     # Authentication stub (no-op for now)
│   │   ├── cors.go                     # CORS headers (default config)
│   │   ├── fee_guarantee.go            # Pre-request fee grant hook — stub, pattern-matched
│   │   ├── logger.go                   # Structured request logging (Gin middleware)
│   │   ├── metrics.go                  # Prometheus counter and histogram recording
│   │   └── rate_limiter.go             # Rate limiting stub keyed by user master key
│   ├── handler/
│   │   ├── health.go                   # GET /health-check
│   │   ├── metrics.go                  # GET /metrics
│   │   ├── sp_url_intercept.go         # Intercepts getSPUrlByBucket — returns own ADNL address
│   │   └── proxy.go                    # Catch-all reverse proxy handler
│   ├── router/
│   │   └── router.go                   # Gin engine setup — registers routes and middleware
│   ├── server/
│   │   ├── http.go                     # localhost TCP server — fx.Hook (OnStart/OnStop)
│   │   └── adnl.go                     # ADNL/RLDP server — fx.Hook (OnStart/OnStop)
│   ├── adnl/
│   │   ├── listener.go                 # ADNL/RLDP accept loop, translates to http.Request
│   │   └── key.go                      # Ed25519 key loading and ADNL address derivation
│   ├── greenfield/
│   │   ├── dns_registration.go         # Submits changeRecord to register ADNL address under DNS_NAME
│   │   └── fee_allowance.go            # Submits MsgGrantAllowance on-chain
│   ├── observability/
│   │   ├── logger.go                   # slog logger construction
│   │   └── registry.go                 # Prometheus registry construction
│   └── apperror/
│       └── apperror.go                 # AppError type — status code, error code, writeError helper
├── .env.example
├── go.mod
├── go.sum
└── Makefile
```

All business logic files for upload, delete, delegation, ephemeral keys, ownership verification, and user permissions are removed. The `greenfield/` package now contains a single file — `fee_allowance.go` — used only by the fee guarantee hook.

---

## Dependencies

| Module | Purpose |
|---|---|
| `github.com/gin-gonic/gin` | HTTP router and handler framework |
| `github.com/gin-contrib/cors` | CORS middleware for Gin |
| `go.uber.org/fx` | Dependency injection and application lifecycle |
| `github.com/bnb-chain/greenfield-go-sdk` | On-chain fee grant submission |
| `github.com/prometheus/client_golang` | Prometheus metrics |
| `log/slog` | Structured JSON logging (stdlib since Go 1.21) |
| `github.com/go-playground/validator/v10` | Config struct validation |
| `github.com/joho/godotenv` | `.env` file loading in development |
| `github.com/cenkalti/backoff/v4` | Exponential backoff for fee grant retries |
| `golang.org/x/time/rate` | Token bucket rate limiter (Phase 7) |

---

## Dependency Injection with fx

`uber-go/fx` wires the application through constructor functions. Each component declares its dependencies as function parameters and returns a constructed value. `fx` resolves the full dependency graph at startup, detects missing or circular dependencies at compile time, and calls `OnStart`/`OnStop` hooks in topological order.

`internal/fx/modules.go` groups providers by concern into `fx.Option` values — one for observability, one for the Gin router, one for the HTTP server, one for the ADNL server, one for the Greenfield client, and one for the handler layer. `cmd/server/main.go` composes these modules into a single `fx.New(...)` call. No component imports another directly — every dependency crosses package boundaries only through constructor parameters.

```go
// internal/server/http.go
func NewHTTPServer(cfg *config.Config, router *gin.Engine, lc fx.Lifecycle) {
    srv := &http.Server{Addr: fmt.Sprintf("127.0.0.1:%d", cfg.Port), Handler: router}
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error { go srv.ListenAndServe(); return nil },
        OnStop:  func(ctx context.Context) error { return srv.Shutdown(ctx) },
    })
}
```

The ADNL server follows the same pattern — a constructor that receives `*config.Config`, `*adnl.Listener`, and `fx.Lifecycle`, and registers `OnStart`/`OnStop` hooks.

---

## Transport Layer

### HTTP/TCP (localhost)

Gin is configured in `internal/router/router.go` with `gin.New()` (not `gin.Default()`). The TCP server in `internal/server/http.go` wraps the engine in a `net/http.Server` bound to `127.0.0.1:PORT`, ensuring the HTTP interface is never accidentally exposed beyond localhost.

### ADNL/RLDP

The ADNL server in `internal/server/adnl.go` starts an ADNL/RLDP listener using the key from `ADNL_PRIVATE_KEY` (or `--adnl-key`). The service's ADNL address is derived as `SHA-256(type_id || ed25519_public_key)` and logged at startup for ION DNS registration.

`internal/adnl/listener.go` runs the accept loop. For each inbound RLDP request it deserialises the TL-encoded `http.request` structure into a Go `*http.Request`, constructs a response writer that serialises the reply back into an RLDP response, and dispatches through the same Gin engine used by the TCP server. ADNL-specific context values (`adnl_address`, `adnl_rldp_id`) are injected into the Gin context here for the logger to read.

---

## Middleware

Middleware is registered in `internal/router/router.go` in the following order. CORS runs first so preflight requests are answered before auth. The logger runs last so it captures the final status code after all other middleware has completed.

**`middleware/cors.go`** — Applies CORS headers via `cors.Default()` from `github.com/gin-contrib/cors`. Stub — allowed origins will be tightened once client topology is known.

**`middleware/auth.go`** — Currently a no-op that calls `c.Next()` immediately. When implemented: validates credentials, attaches a verified identity struct (including user master key and Greenfield address) to the Gin context, or calls `c.AbortWithStatusJSON(401, ...)`.

**`middleware/fee_guarantee.go`** — Runs before each request. Checks whether the request URL matches any configured pattern from a pattern list (stub — patterns and matching logic are not yet defined). On a match, submits a `MsgGrantAllowance` on-chain via `greenfield.GrantFeeAllowance()` before calling `c.Next()`. If the grant fails, the request is aborted with `502`. On no match, calls `c.Next()` immediately. The pattern list and the identity of the grantee (likely derived from the auth context) are both stubs to be filled in when the fee guarantee requirements are specified.

**`middleware/rate_limiter.go`** — Currently a no-op stub. When implemented: reads the user's master key from the auth identity in the Gin context, applies a per-key token bucket, falls back to per-IP for unauthenticated routes.

**`middleware/metrics.go`** — Records `http_requests_total` and `http_request_duration_seconds` using `c.FullPath()` as the path label to avoid cardinality explosion.

**`middleware/logger.go`** — Emits one structured JSON log line per request after the handler completes. Fields:

| Field | Source |
|---|---|
| `remote_addr` | `c.ClientIP()` |
| `method` | `c.Request.Method` |
| `path` | `c.FullPath()` — route pattern |
| `status` | Final HTTP status code |
| `latency_ms` | Wall time from request receipt to response flush |
| `request_size` | `c.Request.ContentLength` in bytes |
| `response_size` | Bytes written to the response body |
| `request_id` | UUID generated at request start; set as `X-Request-Id` response header |
| `user_id` | From auth identity in Gin context; empty if unauthenticated |
| `user_master_key` | Masked (first 6 + last 4 chars); empty if unauthenticated |
| `adnl_address` | ADNL address of the calling node; absent for TCP requests |
| `adnl_rldp_id` | RLDP transfer ID; absent for TCP requests |

**Error responses** are written via `apperror.WriteError(c, err)`. All handlers use this helper. Every error response body is `{ "error": "string", "code": "SCREAMING_SNAKE" }`.

---

## Route Specifications

### GET /health-check

Returns `200 OK` with body `{"ok": true}`. No business logic. Used by orchestration liveness probes.

### GET /metrics

In production, served on a separate internal port (`METRICS_PORT`). In `development` mode, `METRICS_PORT` is optional — if unset, the route is added to the main Gin router and a startup warning is logged. Uses `promhttp.HandlerFor` with the application registry. No authentication.

### getSPUrlByBucket intercept

When a request matches the `getSPUrlByBucket` URL path on the Greenfield RPC, `handler/sp_url_intercept.go` handles it locally and never forwards to upstream. The route is registered by exact path in `router.go` before the catch-all proxy handler — no body inspection required, no request buffering.

The handler returns the service's own ADNL address as the SP endpoint URL. The ADNL address is derived at startup from `ADNL_PRIVATE_KEY` and stored in the config, so the handler has no runtime dependency on the ADNL listener. The response shape mirrors a real Greenfield `getSPUrlByBucket` response with the `endpoint` field replaced by the ADNL address. The client treats this response as authoritative and routes all subsequent SP traffic back through this service over the overlay — making no direct connections to the real SP at any point.

### ANY /*path (reverse proxy)

All other requests are handled by `handler/proxy.go`, which forwards them to the configured upstream (`GREENFIELD_RPC_ENDPOINT` or `GREENFIELD_SP_ENDPOINT`) using Go's standard `httputil.ReverseProxy`. Request headers, body, and method are passed through unmodified. The upstream response — including status code, headers, and body — is streamed back to the caller without buffering or inspection.

The proxy handler is registered as a Gin no-route handler (`router.NoRoute`) and as a wildcard route (`/*path`) so that it catches every request that does not match `/health-check` or `/metrics`.

---

## Observability

### Logging

`log/slog` is used for all structured logging. A logger is constructed in `internal/observability/logger.go` with JSON output and the level from `LOG_LEVEL`, provided to all components via `fx` constructor injection. All log lines within a request carry the request ID via a child logger stored in the Gin context.

Sensitive values — private keys, credentials, full auth headers — must never appear in any log line. The `internal/greenfield` layer wraps SDK errors and strips raw error strings before passing them to the logger.

### Metrics

A dedicated `prometheus.Registry` is constructed in `internal/observability/registry.go` and injected via `fx` into every component that registers metrics. The following are registered at startup.

**`http_requests_total`** — Counter. Labels: `method`, `path`, `status_code`. Incremented on every response by `middleware/metrics.go`.

**`http_request_duration_seconds`** — Histogram. Labels: `method`, `path`, `status_code`. Bucket boundaries: 5ms, 25ms, 100ms, 500ms, 1s, 5s, 10s.

**`proxy_upstream_errors_total`** — Counter. Labels: `upstream` (`rpc`, `sp`). Incremented when the upstream connection fails or returns a 5xx.

**`fee_guarantee_total`** — Counter. Labels: `result` (`granted`, `skipped`, `failed`). Incremented by `middleware/fee_guarantee.go` on every request, indicating whether a fee grant was issued, not needed, or failed.

**`fee_guarantee_duration_seconds`** — Histogram. Measures wall time of the `MsgGrantAllowance` submission when a pattern match triggers the hook.

Go runtime metrics are collected via `collectors.NewGoCollector()` and `collectors.NewProcessCollector()`.

---

## Implementation Phases

### Phase 1 — Project Scaffold

Initialise the Go module and repository layout. Create all directories and empty placeholder files matching the project structure. Set up the `Makefile` with `build`, `run`, `test`, and `lint` targets. Add `.env.example` with placeholder values for every required variable. No logic at this stage — the goal is a compilable, empty skeleton that establishes the file and package conventions the rest of the work builds on.

### Phase 2 — Config Parsing and Loading

Implement `internal/config/config.go` with full env var and CLI flag validation using `os` and `flag`. All variables are validated at startup — missing or malformed values cause a descriptive fatal log before any listener binds. `ADNL_PRIVATE_KEY` / `--adnl-key` precedence is resolved here. Implement `github.com/joho/godotenv` loading in `development` mode. Wire `internal/fx/modules.go` with the config provider. At the end of this phase, running the binary with a valid `.env` starts, logs the resolved config, and exits cleanly.

### Phase 3 — HTTP Server and Health Check

Set up `internal/observability/` with the slog logger and Prometheus registry. Wire `cmd/server/main.go` with the full `fx.New(...)` call. Implement the Gin router in `internal/router/router.go` with all middleware registered in order: CORS, auth stub, fee guarantee stub, rate limiter stub, metrics, logger. Implement `GET /health-check` and `GET /metrics` with the dual-port logic. Implement `internal/server/http.go` with the fx lifecycle hook binding to `127.0.0.1:PORT`. Implement `middleware/logger.go` in full — all fields from the logging table (remote address, method, path, status, latency, request size, response size, request ID, user identity, masked master key, ADNL address, ADNL RLDP ID). Implement `internal/greenfield/dns_registration.go` — if both `DNS_PRIVATE_KEY` and `DNS_NAME` are present in config, submit a `changeRecord` transaction on startup to register the service's ADNL address under the given domain name; log a warning and skip if either is absent. At the end of this phase the service starts cleanly, responds to health checks, exposes metrics, emits fully structured log lines on every request, and self-registers in ION DNS when credentials are configured.

### Phase 4 — ADNL Transport

Implement `internal/adnl/key.go` for Ed25519 key loading and ADNL address derivation. Implement `internal/adnl/listener.go` with the RLDP accept loop, HTTP request/response translation, and ADNL context injection for the logger. Implement `internal/server/adnl.go` with the fx lifecycle hooks. Register the ADNL module in `internal/fx/modules.go`. The service now accepts requests on both transports and routes them through the same Gin engine. Write tests for the ADNL request translation logic.

### Phase 5 — Reverse Proxy and SP URL Intercept

Implement `handler/proxy.go` using `httputil.ReverseProxy`. Implement `handler/sp_url_intercept.go` — register it before the catch-all so matching requests are short-circuited. Register the catch-all route as both a `NoRoute` handler and a `/*path` wildcard. The service is now a functional proxy that handles all traffic: intercepted `getSPUrlByBucket` calls return the service's own ADNL address; everything else is forwarded unmodified. Write tests for both paths.

### Phase 6 — Fee Guarantee Hook

Implement `internal/greenfield/fee_allowance.go` with the `MsgGrantAllowance` submission logic. The submission is wrapped in a retry loop using `github.com/cenkalti/backoff/v4` — use `backoff.WithMaxElapsedTime` set to 10 seconds over an `ExponentialBackOff` policy. On exhaustion of the retry budget, abort the request with `502`. On a pattern non-match, call `c.Next()` immediately without any RPC interaction.

Flesh out `middleware/fee_guarantee.go` — define the URL pattern matching mechanism, resolve the grantee identity source from the auth context, and wire the on-chain call with the retry logic. Add `fee_guarantee_total` and `fee_guarantee_duration_seconds` instrumentation. Write tests for pattern matching, the happy-path grant flow, the retry-and-succeed case, and the abort-on-timeout behaviour.

### Phase 7 — Rate Limiter

Implement `middleware/rate_limiter.go` fully — replace the stub with a per-master-key token bucket (`golang.org/x/time/rate`) falling back to per-IP for unauthenticated requests. Write tests covering key-based limiting, IP fallback, and burst behaviour.

### Phase 8 — Remaining Metrics

Add `proxy_upstream_errors_total`, `fee_guarantee_total`, and `fee_guarantee_duration_seconds` to the registry. Verify all labels are correct and that no metric name collides with the Go runtime collectors. Write tests asserting that counters and histograms are incremented on the expected code paths.

### Phase 9 — Integration Tests

End-to-end tests covering the full request path on both transports: TCP and ADNL. Scenarios include clean proxy passthrough, fee guarantee trigger and skip, rate limit enforcement, auth stub rejection path, and upstream error handling. Tests run against a Greenfield testnet instance.

---

## Open Questions

**getSPUrlByBucket response shape.** The handler must return a response that the client treats as a valid SP URL answer. The exact field names and structure of the Greenfield `getSPUrlByBucket` response need to be confirmed so the intercepted response is a drop-in replacement.

**Fee guarantee pattern matching.** The URL patterns that trigger a fee grant are not yet defined. The matching mechanism (exact path, prefix, regex, method+path combination) and the configuration format (hardcoded list, config file, env var) both need to be specified before Phase 6 can begin.

**Fee guarantee grantee identity.** When a fee grant is issued, who is the grantee — the Greenfield address from the JWT subject, a derived ephemeral address, or the client's ADNL address mapped to a chain address? This depends on the auth middleware implementation.

**Auth middleware implementation.** The stub is intentionally thin. The real implementation will require a decision on the authentication scheme (JWT issued by ION Identity, DFNS session token, or ADNL-level identity).
