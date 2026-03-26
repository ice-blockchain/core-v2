# Pulse Aggregate

Analytical query engine using DuckDB. Supports local and federated scatter-gather queries.

## Dependencies
- `@duckdb/node-api` -- embedded OLAP engine

## API Surface
- Local: `pulseCount()`, `pulseTimeSeries()`, `pulseRank()`, `pulseQuery(sql)`
- Federated: `pulseFederatedQuery(query)` -- scatter-gather across all relays
- ETL: `syncPulseEvents(events)` -- bulk-load from LMDB into DuckDB

## Design Decisions
- LMDB is the write store; DuckDB serves analytical reads
- Background ETL via Arrow IPC for max throughput
- Federated queries: any relay can be coordinator
- Partial results returned on timeout with `partialResult: true` flag
- HyperLogLog for approximate distinct counts across relays
