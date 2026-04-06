# ION BNB Greenfield Proxy -- Architecture

## What This Service Does

A transparent reverse proxy between ION clients and BNB Greenfield (RPC + Storage Provider endpoints). Most requests pass through unmodified. The service adds value through its middleware layer: three classes of requests are intercepted, and the rest are forwarded as-is.

The proxy listens on two transports simultaneously -- HTTP/TCP and ADNL/RLDP -- and feeds both into the same Gin engine and middleware stack.

---

## High-Level Architecture

```
                         ION Overlay Network
                                |
                          ADNL/RLDP (UDP)
                                |
                    +-----------+-----------+
                    |                       |
                    |   ION Greenfield      |
 HTTP/TCP -------->|      Proxy            |-------> Greenfield RPC
 (localhost:PORT)  |                       |-------> Greenfield SP
                    |   (Gin engine)        |
                    +-----------+-----------+
                                |
                         On-chain tx:
                      - CreateBucket
                      - PutBucketPolicy
                      - GrantAllowance
                      - ToggleSPAsDelegatedAgent
```

---

## Transport Layer

### HTTP/TCP (localhost)

Standard HTTP/1.1 server bound to `127.0.0.1:{PORT}` (default 3000). Internal and development traffic only -- never exposed beyond localhost.

- Server: `internal/server/http.go`
- Gin engine created in `internal/router/router.go` with `gin.New()` (no default middleware)

### ADNL/RLDP (overlay)

Production client traffic arrives over the ION overlay network via ADNL (Abstract Datagram Network Layer) and RLDP (Reliable Large Datagram Protocol).

- Gateway: `internal/adnl/listener.go` -- accepts ADNL connections on `0.0.0.0:{PORT}` (UDP)
- Key: `internal/adnl/key.go` -- Ed25519 key loading, ADNL address derivation (`SHA-256(type_id || public_key)`)
- DHT: `internal/adnl/dht.go` -- publishes ADNL address to DHT every 60s (TTL 5min) so clients can discover the proxy

#### How ADNL requests become HTTP

```
Client (ADNL peer)
  |
  |  RLDP Query: Request { method, url, headers }
  v
Listener.handlePeer()
  |
  |  1. Deserialise TL-encoded Request into *http.Request
  |  2. Fetch request body via GetNextPayloadPart queries (chunked, 128 KB)
  |  3. Inject X-ADNL-Address and X-ADNL-RLDP-ID headers
  |  4. Dispatch through Gin engine (engine.ServeHTTP)
  |  5. Capture response in ResponseWriter (spooled to disk if > 2 MB)
  |  6. Send TL-encoded Response back via RLDP
  |  7. Client fetches response body via GetNextPayloadPart queries
  v
Same middleware + handlers as TCP
```

**Payload management:**
- Small bodies stay in memory; large bodies (> 2 MB) spill to temp files
- Response payloads held for 5 minutes, then reaped
- Global pending payload cap: 5 GB
- Worker pool: `NumCPU * 5` concurrent requests; excess returns 503

**External address resolution:**
- If `ADNL_EXTERNAL_ADDR` is set, uses that IP:port directly
- Otherwise, detects external IP via STUN (`internal/stun/stun.go`)

---

## Middleware Chain

Registered in `internal/router/router.go` in this order:

```
Request
  | ADNLContextMiddleware   -- extracts X-ADNL-Address, X-ADNL-RLDP-ID from headers
  | CORS                    -- cors.Default() via gin-contrib/cors
  | Metrics                 -- http_requests_total, http_request_duration_seconds
  | RateLimiter             -- global, per-IP, per-user-key token buckets
  | RPCParser               -- parses JSON-RPC body if POST /
  | RPCIntercept            -- StorageProviders rewrite, CreateBucket intercept
  | FeeGuarantee            -- grants fee allowance for object CRUD
  | Logger                  -- structured JSON log per request
  v
Handler (ProxySP, ProxyRPC, health-check, metrics)
```

---

## Request Interception

Three classes of requests are intercepted. Everything else passes through to upstream Greenfield.

### 1. StorageProviders ABCI Query

**Where:** `internal/middleware/rpc_intercept.go` -> `interceptStorageProviders()`

**Trigger:** JSON-RPC ABCI query with path `/greenfield.sp.Query/StorageProviders`

```
Client                         Proxy                          Greenfield RPC
  |                              |                                  |
  |  POST / (JSON-RPC)          |                                  |
  |  abci_query StorageProviders|                                  |
  |----------------------------->                                  |
  |                              |  Forward query as-is            |
  |                              |--------------------------------->
  |                              |                                  |
  |                              |  Response: list of SPs with     |
  |                              |  real endpoints                 |
  |                              |<---------------------------------|
  |                              |                                  |
  |                              |  Rewrite each SP endpoint:
  |                              |  "https://sp1.example.com"
  |                              |       becomes
  |                              |  "http://{adnlAddr}/sp/{base64(https://sp1.example.com)}"
  |                              |
  |  Modified SP list            |
  |<-----------------------------|
  |                              |
  |  (client now routes all SP   |
  |   traffic through proxy)     |
```

**Why:** Ensures the client routes all subsequent SP traffic back through this proxy. The client never connects directly to any Greenfield SP.

**Aborts:** Yes -- response is returned locally, never reaches the ProxyRPC handler.

### 2. CreateBucket Broadcast

**Where:** `internal/middleware/rpc_intercept.go` -> `interceptCreateBucket()`

**Trigger:** `broadcast_tx_*` JSON-RPC call containing a `MsgCreateBucket` where `bucket_name == lowercase(creator_hex_address)`

```
Client                         Proxy                          Greenfield Chain
  |                              |                                  |
  |  broadcast_tx_sync           |                                  |
  |  MsgCreateBucket             |                                  |
  |  bucket="a1b2c3..."         |                                  |
  |  creator="0xA1B2C3..."      |                                  |
  |----------------------------->                                  |
  |                              |                                  |
  |                              |  1. Decode TxRaw -> TxBody
  |                              |  2. Find MsgCreateBucket
  |                              |  3. Verify bucket_name == creator addr
  |                              |  4. EIP-712 ecrecover (verify signature)
  |                              |  5. EnsureBucket():
  |                              |     a. CreateBucket (proxy's key)  |
  |                              |     -------------------------------->
  |                              |     b. PutBucketPolicy (grant      |
  |                              |        object CRUD to creator)     |
  |                              |     -------------------------------->
  |                              |     c. ToggleSPAsDelegatedAgent    |
  |                              |     -------------------------------->
  |                              |                                    |
  |  Synthetic broadcast_tx OK   |
  |  (real or synthetic tx hash) |
  |<-----------------------------|
```

**Why:** The proxy owns the bucket (pays storage fees) but grants the user full object-level permissions. The user never needs the proxy's private key.

**Aborts:** Yes -- the real `MsgCreateBucket` is never forwarded to the chain. The proxy creates the bucket itself using its own signing key.

**Simulate requests are NOT intercepted** -- they pass through to upstream so the SDK gets real gas estimates.

### 3. Fee Allowance Grant (Object CRUD)

**Where:** `internal/middleware/broadcast_intercept.go` -> `interceptFeeAllowance()`

**Trigger:** Simulate or `broadcast_tx_*` containing one of these messages, where `bucket_name == creator_hex_address` AND `fee_granter == proxy_address`:

| Message Type | Description |
|---|---|
| `MsgCreateObject` | Create a new object |
| `MsgDelegateCreateObject` | Delegated object creation |
| `MsgUpdateObjectContent` | Update object content |
| `MsgDeleteObject` | Delete an object |
| `MsgDeleteBucket` | Delete a bucket |

```
Client                         Proxy                          Greenfield Chain
  |                              |                                  |
  |  broadcast_tx_sync           |                                  |
  |  MsgCreateObject             |                                  |
  |  fee_granter=proxy_addr      |                                  |
  |----------------------------->                                  |
  |                              |                                  |
  |                              |  1. Decode tx, check fee_granter
  |                              |  2. Match message type + bucket name
  |                              |  3. Verify EIP-712 signature
  |                              |  4. GrantFeeAllowance():
  |                              |     - BasicAllowance (spend limit)
  |                              |     - AllowedMsgAllowance (whitelist)
  |                              |     - 5-minute expiration            |
  |                              |     --------------------------------->
  |                              |                                      |
  |                              |  5. Forward original tx as-is        |
  |                              |  ----------------------------------->|
  |                              |                                      |
  |  Upstream response (as-is)   |              Response                |
  |<-----------------------------|<-------------------------------------|
```

**Why:** The user's tx specifies the proxy as `fee_granter`. The proxy must submit a `MsgGrantAllowance` on-chain *before* the user's tx reaches the chain, otherwise the chain rejects it.

**Does NOT abort:** The request continues to upstream after the grant succeeds.

**Fee allowance parameters:**
- Spend limit: configurable via `GREENFIELD_FEE_GRANT_AMOUNT_BNB` (default `0.001`)
- Expiration: 5 minutes
- Message whitelist: only the 5 message types above

---

## Proxy Handlers (Non-Intercepted Requests)

### SP Proxy (`/sp/{base64}...`)

**Where:** `internal/handler/proxy_sp.go`

Handles requests routed through the rewritten SP endpoints (from intercept #1 above).

```
Client request:  GET /sp/{base64(https://sp1.example.com)}/object/foo
                       |
                       v
                 Decode base64 -> "https://sp1.example.com"
                 Validate: HTTPS only, known SP host
                 Forward:  GET https://sp1.example.com/object/foo
```

**Validation:**
- Only HTTPS SP endpoints allowed (unless `allowInsecureSP` flag is set)
- Target host must be in the cached SP list (`IsKnownSPHost`)
- Host header must match or be a subdomain of the decoded SP origin
- Fail-closed: if validation is unavailable, request is rejected

### RPC Proxy (catch-all)

**Where:** `internal/handler/proxy_rpc.go`

All requests that don't match `/health-check`, `/metrics`, `/guarantor`, or `/sp/*` are forwarded to `GREENFIELD_RPC_ENDPOINT` via `httputil.ReverseProxy`. Headers, body, method, and query params are passed through unmodified.

### Guarantor Discovery (`/guarantor`)

**Where:** `internal/router/router.go` (inline handler)

Returns the proxy's on-chain address and the configured fee grant amount. Clients call this endpoint to discover which address to set as `fee_granter` in their transactions before broadcasting.

```
GET /guarantor

200 OK
{
  "address": "0x...",     // proxy's Greenfield account address
  "amount":  "0.001"      // fee grant spend limit in BNB
}
```

If the bucket provisioner is not configured, returns `403` with `{"code": "PROVISIONER_UNAVAILABLE", "error": "bucket provisioning not configured"}`.

**Why:** The fee guarantee middleware (intercept #3) only activates when a transaction's `fee_granter` matches the proxy address. The client needs to know this address upfront to construct the transaction correctly. The `amount` field lets the client display or validate the fee budget without hardcoding it.

---

## Routes

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/health-check` | `handler.Health` | Liveness probe, returns `{"ok": true}` |
| GET | `/guarantor` | inline (`router.go`) | Returns proxy address + fee grant amount for client tx construction |
| GET | `/metrics` | `handler.MetricsHandler` | Prometheus metrics (main port in dev, `METRICS_PORT` in prod) |
| ANY | `/sp/*path` | `handler.ProxySP` | SP reverse proxy with base64-decoded routing |
| ANY | `*` (NoRoute) | `handler.ProxyRPC` | Catch-all RPC reverse proxy |

---

## On-Chain Operations

All on-chain transactions are serialized through a context-aware mutex (`internal/ctxlock/ctxlock.go`) to prevent sequence number races on the proxy wallet.

| Operation | When | What |
|---|---|---|
| `CreateBucket` | CreateBucket intercept | Creates bucket owned by proxy, with user's address as name |
| `PutBucketPolicy` | After CreateBucket | Grants object CRUD permissions to the user |
| `ToggleSPAsDelegatedAgent` | After PutBucketPolicy | Enables SP to act as delegated agent for the bucket |
| `GrantAllowance` | Fee guarantee middleware | Short-lived fee grant so user can broadcast at proxy's expense |

**Bucket provisioning details (`internal/greenfield/bucket.go`):**
- Buckets are named after the user's lowercase hex address (without `0x`)
- Visibility: `PUBLIC_READ`
- Payment address: proxy account
- Charged quota: 30 GB
- SP selection: prefers `.bnbchain.io` endpoints, tries each SP until one succeeds
- Results cached in memory (`known` map) -- bucket existence is only checked once

---

## Signature Verification

All intercepted transactions are verified before the proxy takes any on-chain action.

**Broadcast path (full ecrecover):**
1. Decode `TxRaw` -> extract `AuthInfo` pubkey
2. Fetch account number from chain (cached permanently)
3. Compute EIP-712 sign bytes
4. Recover signer address via secp256k1 ecrecover
5. Compare recovered address against declared creator

**Simulate path (pubkey extraction only):**
- Simulate requests may carry placeholder signatures
- Signer address is extracted from `AuthInfo` pubkeys directly (no ecrecover)

Implementation: `internal/greenfield/tx_signer.go`, `internal/greenfield/ecrecover.go`

---

## Configuration

### Required

| Variable | Type | Description |
|---|---|---|
| `GREENFIELD_RPC_ENDPOINT` | URL | Upstream Greenfield RPC endpoint |
| `GREENFIELD_PRIVATE_KEY` | `0x`-prefixed hex | Proxy wallet's private key for signing on-chain tx |
| `GREENFIELD_CHAIN_ID` | integer | Greenfield network chain ID |
| `ADNL_PRIVATE_KEY` | hex string | Ed25519 seed defining the ADNL identity (auto-generated in `development`) |

### Optional

| Variable | Default | Description |
|---|---|---|
| `GREENFIELD_FEE_GRANT_AMOUNT_BNB` | `0.001` | BNB spend limit per fee grant |
| `PORT` | `3000` | TCP + ADNL listen port |
| `METRICS_PORT` | *(required in prod)* | Separate port for `/metrics`. If unset in dev, served on main port |
| `ADNL_CONFIG_URL` | `https://cdn.ice.io/testnet/global.config.json` | DHT bootstrap config URL |
| `ADNL_EXTERNAL_ADDR` | *(STUN auto-detect)* | External IP:port for DHT publishing |
| `RATE_LIMIT_PER_KEY` | `100` | Requests per hour per user key |
| `RATE_LIMIT_PER_IP` | `1000` | Requests per hour per IP |
| `RATE_LIMIT_GLOBAL` | `5000` | Total requests per hour |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `ENV` | `production` | `development` or `production` |

### CLI Flag Overrides

| Flag | Overrides |
|---|---|
| `--adnl-key` | `ADNL_PRIVATE_KEY` |

---

## Rate Limiting

Three tiers of token-bucket rate limiting (`internal/middleware/rate_limiter.go`):

1. **Global** -- single limiter for all traffic
2. **Per-IP** -- `c.ClientIP()` as key
3. **Per-user-key** -- tx signer address as key (only applies when signer is known)

Stale entries (no access for 1 hour) are evicted every 10 minutes. Rejected requests get HTTP 429 with `Retry-After: 60` header.

---

## Observability

### Metrics (`internal/middleware/metrics.go`)

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `path`, `status_code` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `path`, `status_code` | Request latency |
| `proxy_upstream_errors_total` | Counter | `upstream` (`rpc`/`sp`) | Upstream connection failures and 5xx |
| `proxy_upstream_response_time_seconds` | Histogram | `upstream` | Upstream response latency |
| `fee_guarantee_requests_total` | Counter | `result` (`granted`/`skipped`/`failed`) | Fee grant outcomes |
| `fee_guarantee_spend_bnb_total` | Counter | -- | Approximate total BNB granted |
| `fee_guarantee_duration_seconds` | Histogram | -- | Fee grant submission wall time |
| `req_limited_by_user` | Counter | -- | Requests rejected by per-key limit |
| `req_limited_by_ip` | Counter | -- | Requests rejected by per-IP limit |
| `req_limited_global` | Counter | -- | Requests rejected by global limit |

### Logging

Structured JSON via `log/slog`. One log line per request with: remote addr, method, path, status, latency, request/response size, request ID, user ID, masked master key, ADNL address, ADNL RLDP ID.

---

## Dependency Injection

`uber-go/fx` wires the application. Modules defined in `internal/fx/modules.go`:

| Module | Provides / Invokes |
|---|---|
| `ObservabilityModule` | Logger, Prometheus registry, metrics collectors |
| `ADNLModule` | ADNL key, ADNL listener |
| `RouterModule` | Gin engine with full middleware chain |
| `ServerModule` | HTTP server, metrics server, ADNL server, DHT publisher |
| `GreenfieldModule` | Greenfield SDK client, bucket provisioner |

Entry point: `cmd/server/main.go` -- parses CLI flags, loads config, composes all modules into `fx.New().Run()`.

---