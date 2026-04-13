# pulse-bench

Benchmarking harness using criterion for all storage engines and core operations.

## Crate

`pulse-bench` -- `shared/pulse/bench/`

## Dependencies

- `criterion` 0.5 (benchmarking framework)
- `pulse-types`, `pulse-auth`, `pulse-graph`, `pulse-kv`, `pulse-shard`, `pulse-signal`

## Benchmarks

Run with: `cargo bench -p pulse-bench`

| Benchmark | What It Measures |
|-----------|-----------------|
| `SignedEvent::compute_id` | SHA-256 event ID computation speed |
| `HashRing::locate_key` | Ring lookup with 3/10/50/100 nodes |
| `SignalHub::emit` | Path trie emit to 10 subscribers |
| `KvStore::get` | LMDB key-value read latency |
| `KvStore::put` | LMDB key-value write latency |
| `GraphStore::get_event` | LMDB graph event read latency |

## Quick Smoke Test

Run with: `cargo run -p pulse-bench`

Validates all subsystems initialize correctly and reports creation times.

## Files

| File | Purpose |
|------|---------|
| `src/main.rs` | Quick smoke test binary |
| `benches/storage.rs` | Criterion benchmarks for all engines |
