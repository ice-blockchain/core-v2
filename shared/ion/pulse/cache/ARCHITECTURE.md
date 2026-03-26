# Pulse Cache

Non-authoritative hot data LRU cache with TTL on relay servers.

## Dependencies
- `lru-cache` -- in-memory LRU with TTL

## API Surface
- `createPulseCache(config)` -- initialize LRU cache
  - `pulseGetCached(soul)` -- read-through cache: check local, fetch from shard owner on miss
  - `pulseInvalidateCache(soul)` -- invalidate on GossipSub update
  - `pulseCacheStats()` -- hit rate, miss rate, eviction count, memory usage

## Design Decisions
- Non-authoritative: caching relay does NOT become responsible for the data
- LRU eviction with configurable TTL (default: 5 min) and max size (default: 256 MB)
- Invalidated by GossipSub updates for cached souls
- In-memory only; lost on relay restart (by design)
