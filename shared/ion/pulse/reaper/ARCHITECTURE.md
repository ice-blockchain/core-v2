# Pulse Reaper

Garbage collection, TTL expiry, and GDPR hard delete propagation.

## Dependencies
- `@ion/pulse-store` (storage access for deletion)
- `@ion/pulse-mesh` (propagate erasure requests)

## API Surface
- `createPulseReaper(config)` -- create reaper instance
  - `startReaperSweep()` -- begin periodic TTL sweep
  - `stopReaperSweep()` -- stop sweeping
  - `pulseErase(soul)` -- GDPR hard delete with network propagation
- Config: `sweepInterval`, `tombstoneTtl` (default: 30 days), `erasureTimeout`

## Design Decisions
- TTL sweep: periodic scan for nodes with expiresAt < now
- GDPR erase: signed erasure request propagated to all shard owners
- Erasure receipts confirm physical deletion across the network
- Tombstones have their own TTL and are pruned by the reaper
