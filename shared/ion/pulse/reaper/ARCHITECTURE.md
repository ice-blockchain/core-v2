# Pulse Reaper

Garbage collection engine with tombstone-based soft delete, TTL expiry sweeps, and GDPR-compliant hard erasure with propagation.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseReaper` | function | Creates a PulseReaper with configurable sweep intervals and TTLs |
| `createReaperStorage` | function | Creates an in-memory tombstone/erasure receipt store |
| `PulseReaper` | type | Reaper interface: tombstones, erasure, sweep, auto-sweep lifecycle |
| `PulseReaperConfig` | type | `{ sweepIntervalMs?, tombstoneTtlMs?, erasurePropagationTimeoutMs? }` |
| `PulseErasureRequest` | type | `{ soul, requestedAt, requestedBy, signature? }` |
| `PulseErasureReceipt` | type | `{ soul, erasedAt, erasedBy, success }` |
| `PulseTombstone` | type | `{ soul, deletedAt, expiresAt }` |
| `ReaperStorage` | type | Tombstone storage interface |
| `ErasureHandler` | type | `(request) => Promise<PulseErasureReceipt>` -- propagation callback |

### PulseReaper Interface

| Method | Description |
|---|---|
| `addTombstone(soul)` | Mark a soul as deleted with TTL-based expiry |
| `getTombstone(soul)` | Look up tombstone for a soul |
| `registerErasureHandler(handler)` | Register a handler for GDPR erasure propagation |
| `requestErasure(request)` | Execute all registered handlers; returns receipts from successful handlers |
| `sweep()` | Remove expired tombstones; returns lists of pruned souls |
| `startAutoSweep()` | Start periodic sweep on `sweepIntervalMs` interval |
| `stopAutoSweep()` | Stop the periodic sweep timer |
| `destroy()` | Stop sweep and clear all handlers |

### Defaults

| Config | Default |
|---|---|
| `sweepIntervalMs` | 60,000 (1 minute) |
| `tombstoneTtlMs` | 2,592,000,000 (30 days) |
| `erasurePropagationTimeoutMs` | 30,000 (30 seconds) |

## Dependencies

None. Zero external dependencies.

## Design Decisions

- Tombstone-based soft delete with configurable TTL -- deleted nodes remain as tombstones for 30 days (default) so peers can replicate the deletion; expired tombstones are pruned by sweep
- GDPR erasure with propagation handlers -- `requestErasure` fans out to all registered handlers (other shards, remote peers) with `Promise.allSettled` to collect receipts; individual handler timeouts prevent blocking
- Configurable sweep intervals -- auto-sweep runs on `setInterval`; can be disabled for manual control in tests
- Separation of storage -- `createReaperStorage` is a standalone in-memory store; can be replaced with persistent storage for production
