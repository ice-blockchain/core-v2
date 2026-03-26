# Pulse Bench

Benchmarking and end-to-end integration testing harness.

## Dependencies
- `dockerode` -- Docker API for relay container lifecycle
- `worker_threads` -- Node.js built-in for multi-user emulation

## Components
- `pulse-bench.ts` -- orchestrator: starts Docker cluster, spawns workers, runs scenarios
- `relay-container.ts` -- Docker relay lifecycle (create, start, stop, kill)
- `client-worker.ts` -- worker thread emulating a user client
- `data-generator.ts` -- generates realistic test data

## Test Scenarios
- Shard routing, cache behavior, replica repair, offline reconciliation
- CRDT convergence, federated aggregation, GDPR erase, semantic search
- Network chaos (unstable network simulation), performance benchmarks

## Design Decisions
- Docker containers for realistic relay testing
- worker_threads for concurrent user emulation
- Each worker has its own Ed25519 key pair
- Traffic control (tc) in containers for latency/packet loss injection
