# CDN Uploader

## Purpose

Downloads files from BNB Greenfield Storage Providers and uploads them to Bunny CDN. Consumes BullMQ jobs produced by the `greenfield-ingester` service.

## Data Flow

```
greenfield-ingester (Go) --> BullMQ: greenfield-events
                                  |
                          greenfield-processor (N instances)
                                  |
                  Router Worker (classify events)
                         |                |
                       skip            upload
                                         |
                              RPUSH cdn:pending-uploads
                                         |
                              Batch Assembler (timer)
                                         |
                              Upload Worker (per batch):
                                1. Resolve SP endpoint (on-chain)
                                2. Resumable download (HTTP Range)
                                3. Upload to Bunny (HTTP < 50MB, FTP >= 50MB)
                                4. Store metadata in Redis
```

## Key Design Decisions

### Dynamic SP Discovery
Storage Provider endpoints are resolved per-bucket via on-chain queries (`headBucket` + `getStorageProviders`), not hardcoded. SP list cached 1h in-memory; bucket-to-SP mapping cached 1h in Redis. Mirrors the Go pattern in `ion-greenfield-proxy/internal/greenfield/bucket.go`.

### Resumable Downloads
Downloads use HTTP Range headers directly to SP endpoints (the JS SDK lacks range support). Partial `.part` files persist on disk; BullMQ retries resume from last byte automatically.

### Resumable FTP Uploads
For files >= 50MB, `basic-ftp` resume pattern: `size()` checks existing bytes, `appendFrom()` appends remaining via FTP APPE command. Post-upload size verification catches silent truncation.

### Batch Assembly
Router pushes items to a Redis list (`cdn:pending-uploads`). A repeatable BullMQ trigger fires on interval, atomically LPOPs N items via Lua script, and creates a batch job. Race-free across instances.

## Dependencies

| Package | Purpose |
|---|---|
| `@bnb-chain/greenfield-js-sdk` | On-chain SP queries (no private key needed) |
| `basic-ftp` | FTP uploads with resume support |
| `bullmq` | Job queue (consuming from Go ingester) |
| `ioredis` | Redis client (BullMQ-compatible) |
| `generic-pool` | FTP connection pooling |
| `fastify` | Health check and metrics HTTP server |
| `prom-client` | Prometheus metrics |
| `undici` | DNS-pinned HTTP fetch (SSRF protection) |
| `pino` | Structured logging |

## Environment Variables

| Var | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `GREENFIELD_RPC_URL` | testnet | Chain RPC for SP queries |
| `GREENFIELD_CHAIN_ID` | `greenfield_5600-1` | Chain ID |
| `BUNNY_STORAGE_ZONE` | required | Bunny storage zone |
| `BUNNY_STORAGE_PASSWORD` | required | Bunny API key |
| `BUNNY_STORAGE_REGION` | `ny` | Bunny region |
| `BUNNY_FTP_HOST` | `storage.bunnycdn.com` | FTP host |
| `FTP_MAX_CONNECTIONS` | `5` | Max FTP pool size |
| `ALLOWED_SP_HOSTNAME_PATTERN` | (none) | Regex to restrict SP hostnames |
| `MAX_SEGMENT_SIZE` | `16777216` | Greenfield segment size for checksum verification |
| `REDIS_PASSWORD` | required | Redis authentication password |

## Security Considerations

### SSRF Protection
SP endpoints resolved from the blockchain are validated before use:
- Only HTTPS endpoints accepted
- Hostname string checked against private/reserved names (localhost, [::1])
- DNS resolution performed; resolved IP checked against private IPv4 (10.x, 172.x, 192.168.x, 127.x, 169.254.x, 0.x) and IPv6 (::1, fe80::/10, fc00::/7, ::ffff: mapped) ranges
- Optional `ALLOWED_SP_HOSTNAME_PATTERN` restricts to known SP domains (auto-anchored with ^ and $)

### DNS Pinning (Anti-Rebinding)
To prevent DNS rebinding attacks (TOCTOU between validation and fetch), all outbound HTTP requests to SP endpoints use DNS-pinned fetch:
1. `assertSafeEndpoint()` resolves DNS and validates the IP, returning `{ ip, family }`
2. A per-request undici `Agent` is created with `connect.lookup` pinned to the validated IP
3. `fetchWithPinnedDns()` uses this dispatcher so the actual TCP connection goes to the validated IP
4. TLS SNI/cert validation still uses the original hostname — only IP resolution is pinned
DNS is re-validated on every request, even when the SP URL is cached in Redis (the cache saves the on-chain RPC call, not the DNS validation).

### Download Integrity
Downloaded files are verified in three stages: (1) pre-check against claimed `payload_size` vs `MAX_DOWNLOAD_SIZE`, (2) streaming byte counter aborts if actual bytes exceed `MAX_DOWNLOAD_SIZE`, (3) integrity hash verification against `checksums[0]`. The integrity hash follows Greenfield's scheme: SHA-256 each 16MB segment, concatenate hashes, SHA-256 the result. Files that fail verification are deleted.

### Per-Item Processing Lock
Each item (`bucket:object:version`) is locked in Redis via `SET NX` with a 10-minute TTL before processing. Prevents duplicate downloads/uploads when batches overlap or during BullMQ redelivery. Lock released via Lua script (only owner can release). Items already locked are skipped.

### Upload Idempotency
Batch retries (via BullMQ `attempts: 5`) track completed items in `job.progress`. Already-succeeded items are skipped on retry. Items exceeding `MAX_RETRIES` are moved to `cdn:dead-letter-uploads`.

### Stale File Cleanup
On startup, `.part` files older than 30 minutes in the temp directory are removed to prevent disk exhaustion from prior crashes.

### Endpoints
`/health-check` and `/metrics` are intentionally unauthenticated. They must remain internal-only and not be exposed via reverse proxy without auth.

### Redis Authentication
Dragonfly (Redis) requires password authentication via `--requirepass`. Connection URLs include credentials.

## Redis Keys

| Key | Type | TTL |
|---|---|---|
| `greenfield-processor:bucket-sp:{bucket}` | String | 1h |
| `cdn:pending-uploads` | List | none |
| `cdn:content-type:{bucket}:{object}` | String | 1h |
| `cdn:uploads:{bucket}:{object}` | Hash | none |
| `cdn:recent-uploads` | Sorted Set | none |
| `cdn:dead-letter-uploads` | List | none |
| `cdn:item-lock:{bucket}:{object}:{version}` | String | 10m |
