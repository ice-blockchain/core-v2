# Pulse Bench

## Purpose
End-to-end benchmarking and integration testing with Docker relay clusters and multi-user emulation.

## API
- `createPulseBench(config?)` -- create bench suite
- `run(scenarioName)` -- execute one scenario
- `runAll()` -- execute all scenarios
- `getAvailableScenarios()` -- list scenarios

## Scenarios
- shard-routing, cache-behavior, replica-repair
- offline-reconciliation, crdt-convergence, federated-aggregation
- gdpr-erase, semantic-search, network-chaos, performance

## Infrastructure (planned)
- `Dockerfile.relay` -- relay container image
- `docker-compose.bench.yml` -- multi-relay cluster
- `dockerode` for programmatic Docker control
- `worker_threads` for client emulation

## Status
Scaffold with placeholder scenarios. Docker and worker integration pending.
