# Pulse Cache

Non-authoritative LRU cache with byte-size-based eviction, TTL, and hit/miss/eviction statistics for relay servers.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseCache` | function | Creates a PulseCache backed by `lru-cache` |
| `PulseCache` | type | Cache interface: get/set, invalidate, stats, lifecycle |
| `PulseCacheConfig` | type | `{ maxSizeBytes?, defaultTtlMs? }` |
| `PulseCacheStats` | type | `{ hits, misses, evictions, size, maxSize }` |

### PulseCache Interface

| Method | Description |
|---|---|
| `get(soul)` | Look up cached state; increments hit or miss counter |
| `set(soul, data)` | Store data in cache with default TTL |
| `invalidate(soul)` | Remove a specific entry |
| `invalidatePrefix(prefix)` | Remove all entries whose key starts with prefix |
| `has(soul)` | Check presence without affecting hit/miss stats |
| `getStats()` | Return hit/miss/eviction counters and current size |
| `clear()` | Flush cache and reset counters |
| `destroy()` | Permanently disable the cache instance |

### Defaults

| Config | Default |
|---|---|
| `maxSizeBytes` | 268,435,456 (256 MB) |
| `defaultTtlMs` | 300,000 (5 minutes) |

## Dependencies

- `lru-cache` -- battle-tested LRU implementation with size-based eviction and TTL

## Design Decisions

- Byte-size-based eviction -- `sizeCalculation` uses `value.byteLength` so the cache respects memory limits rather than entry count
- Non-authoritative -- cache is a hot-path optimization for relay servers; misses fall through to the authoritative Store layer
- Prefix invalidation -- enables invalidating all entries under a soul prefix (e.g., all of a user's data) without iterating the full cache
- Hit/miss/eviction stats -- observable performance metrics for monitoring cache effectiveness; eviction counter tracks `dispose` events with reason `'evict'`
- Destroyed guard -- all operations throw after `destroy()` to prevent use-after-free bugs
