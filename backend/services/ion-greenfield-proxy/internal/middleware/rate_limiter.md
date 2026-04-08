# Rate Limiter

Three-tier token bucket rate limiter protecting the proxy from abuse.

## Buckets

| Bucket | Key | Default | Env Var | Metric |
|---|---|---|---|---|
| Global | shared (all requests) | 5000/hr | `RATE_LIMIT_GLOBAL` | `req_limited_global` |
| Per peer | `c.ClientIP()` or ADNL address | 1000/hr | `RATE_LIMIT_PER_IP` | `req_limited_by_ip` |
| Per user key | `tx_signer` from context | 100/hr | `RATE_LIMIT_PER_KEY` | `req_limited_by_user` |

The per-key bucket only applies when a `tx_signer` is present in the gin context (set by the RPC/broadcast intercept middleware for signed transactions). Unsigned requests are subject to global and per-peer limits only.

## Peer Identity Resolution

The per-peer bucket needs a stable identifier for each client. The rate limiter resolves peer identity with a fallback chain:

1. **`c.ClientIP()`** -- used for HTTP/TCP requests where `RemoteAddr` is set
2. **`ContextKeyADNLAddress`** -- used for ADNL requests where `RemoteAddr` is empty and the ADNL public key is available from context
3. **No identity** -- if neither is available, per-peer limiting is skipped but global and per-key limits still apply

ADNL requests arrive via the ADNL gateway which converts them into `*http.Request` objects with an empty `RemoteAddr`. Without the fallback, all ADNL traffic would share a single per-peer bucket keyed on `""`, making per-peer limiting ineffective.

## Request Flow
```text
               incoming request
                      |
                      v
             +------------------+
             |  global.Allow()  |
             +------------------+
                |            |
               yes           no ---> inc req_limited_global
                |                    return 429
                v
        +-------------------+
        |  peerIdentity(c)  |
        +-------------------+
           |            |
        non-empty      empty ---> skip per-peer check
           |                           |
           v                           |
        +----------------+             |
        |  peer.Allow()  |             |
        +----------------+             |
           |          |                |
          yes          no ---> inc req_limited_by_ip
           |                   return 429
           v
     tx_signer present? <--------------+
        |          |
       yes          no ---> c.Next() (pass)
        |
        v
    +----------------+
    |  key.Allow()   |
    +----------------+
       |          |
      yes          no ---> inc req_limited_by_user
       |                   return 429
       v
    c.Next() (pass)
```

## Algorithm

Each bucket uses a token bucket (`golang.org/x/time/rate`):

- **Rate**: `limit / 3600` tokens per second
- **Burst**: `limit` (full hourly quota available as burst)

A fresh bucket starts with `burst` tokens. Each `Allow()` call consumes one token. Tokens refill at the steady rate. After exhausting the burst, requests are admitted at roughly `limit / 3600` per second until the bucket refills.

Example with `RATE_LIMIT_PER_KEY=100`:
- A new user can send 100 requests instantly (burst)
- After that, ~1 request every 36 seconds until tokens recover
- After 1 hour of inactivity, the full 100-token burst is available again

## Rejection Response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{"code": "RATE_LIMITED", "error": "rate limit exceeded"}
```

## Memory Management

Per-peer and per-key entries are stored in `xsync.Map` (lock-free concurrent map). A background goroutine runs every 10 minutes and evicts entries not accessed in the last hour. The goroutine is stopped via the cleanup function wired to the fx `OnStop` lifecycle hook.

## Metrics

All three counters are monotonically increasing Prometheus counters. To get per-hour rejection rates in Grafana:

```promql
increase(req_limited_by_user[1h])
increase(req_limited_by_ip[1h])
increase(req_limited_global[1h])
```

## Configuration

All values are optional. Defaults are applied if the env var is missing or empty.

```env
RATE_LIMIT_PER_KEY=100    # requests per hour per tx_signer
RATE_LIMIT_PER_IP=1000    # requests per hour per peer (IP or ADNL address)
RATE_LIMIT_GLOBAL=5000    # requests per hour total
```

Setting a limit to `0` or negative disables that bucket (unlimited).
