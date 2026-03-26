# Pulse Reaper

## Purpose
Garbage collection, TTL-based expiry, and GDPR hard delete with erasure receipts.

## API
- `createPulseReaper(config?)` -- create reaper instance
- `scheduleExpiry(soul, expiresAt)` -- register TTL
- `checkExpired()` -- get expired souls
- `createErasureRequest(options)` -- GDPR erasure request
- `processErasureReceipt(receipt)` -- confirm relay deletion
- `getPendingErasures()` -- unconfirmed erasure requests

## Config
- `sweepIntervalMs` (default: 60000)
- `tombstoneTtlMs` (default: 30 days)
- `erasurePropagationTimeoutMs` (default: 30000)

## Dependencies
None (pure TypeScript).

## Status
Implemented. Network propagation of erasure requests requires Pulse Mesh integration.
