# Pulse Aggregate

## Purpose
Analytical queries: counting, grouping, time-series bucketing, federated scatter-gather.

## API
- `createPulseAggregate(config?)` -- create aggregate instance
- `ingestEvents(events)` -- bulk-load events
- `count(query)` -- GROUP BY with filters
- `timeSeries(query)` -- time-bucketed counts
- `getEventCount()` -- total events
- `clear()` -- reset store

## Federated Queries (planned)
Scatter-gather across relays: coordinator broadcasts query, collects partial results, re-aggregates.

## Dependencies
- Currently: none (in-memory)
- Planned: `@duckdb/node-api`

## Status
In-memory implementation. DuckDB and federated query integration pending.
