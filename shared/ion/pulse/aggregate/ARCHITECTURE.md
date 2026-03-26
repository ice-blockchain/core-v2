# Pulse Aggregate

## Purpose
Analytical queries: counting, grouping, time-series bucketing, federated scatter-gather.

## API
- `createPulseAggregate(config?)` -- factory, returns in-memory or DuckDB instance based on `useDuckDb`
- `createInMemoryAggregate()` -- fast in-memory implementation for tests
- `createDuckDbAggregate()` -- DuckDB-backed implementation for production analytics
- All methods are async (`Promise`-based) for DuckDB compatibility

### Instance methods
- `ingestEvents(events)` -- bulk-load events
- `count(query)` -- GROUP BY with filters
- `timeSeries(query)` -- time-bucketed counts
- `getEventCount()` -- total events
- `clear()` -- reset store
- `close()` -- release DuckDB resources (optional, DuckDB only)

## Implementations

### In-memory (`pulse-aggregate.ts`)
Array-based storage with JS Map for grouping. Fast startup, no dependencies. Used for unit tests.

### DuckDB (`pulse-aggregate-duckdb.ts`)
In-process OLAP engine via `@duckdb/node-api`. Creates `:memory:` database with `pulse_events` table. Uses prepared statements with typed bindings for inserts and parameterized queries for aggregation.

## Federated Queries (planned)
Scatter-gather across relays: coordinator broadcasts query, collects partial results, re-aggregates.

## Dependencies
- `@duckdb/node-api` -- in-process DuckDB for analytics

## Status
DuckDB and in-memory implementations complete. Federated query integration pending.
