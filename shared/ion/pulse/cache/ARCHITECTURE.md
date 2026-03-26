# Pulse Cache

## Purpose
Non-authoritative hot data LRU cache with TTL on relay servers.

## API
- `createPulseCache(config?)` -- create cache
- `get(soul)` -- get cached value (tracks hits/misses)
- `set(soul, value)` -- store with TTL
- `invalidate(soul)` -- remove entry
- `getStats()` -- hits, misses, evictions, size
- `clear()` -- empty cache

## Config
- `maxSizeBytes` (default: 268435456 / 256MB)
- `defaultTtlMs` (default: 300000 / 5 min)

## Dependencies
- `lru-cache` -- LRU eviction with TTL

## Status
Fully implemented. GossipSub invalidation integration requires Pulse Mesh.
