# Pulse Aggregate

In-memory analytics engine with count, time-series, and ranking queries plus federated merge utilities for scatter-gather across shards.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseAggregate` | function | Creates an in-memory aggregate engine |
| `applyPulseFilter` | function | Filter events by type, labels, and time range |
| `mergePulseCountResults` | function | Merge count results from multiple shards |
| `mergePulseTimeSeriesResults` | function | Merge time-series buckets from multiple shards |
| `mergePulseRankResults` | function | Merge rank results with re-ranking and limit |
| `PulseAggregate` | type | Aggregate interface: ingest, count, timeSeries, rank |
| `PulseEvent` | type | `{ id, soul, type, timestamp, data, labels? }` |
| `PulseCountQuery` | type | `{ groupBy, filter? }` |
| `PulseCountResult` | type | `{ key, count }` |
| `PulseTimeSeriesQuery` | type | `{ bucketMs, startTime, endTime, filter? }` |
| `PulseTimeSeriesResult` | type | `{ bucket, count }` |
| `PulseRankQuery` | type | `{ scoreField, limit, filter? }` |
| `PulseRankResult` | type | `{ soul, score, rank }` |
| `PulseAggregateFilter` | type | `{ type?, labels?, startTime?, endTime? }` |
| `PulseFederatedResult` | type | Wrapper with `results`, `isPartial`, peer success/failure lists |

### PulseAggregate Interface

| Method | Description |
|---|---|
| `ingestEvents(events)` | Append events; auto-truncates to `maxEvents` (default 1M) |
| `pulseCount(query)` | Group-by count with optional filtering, sorted descending |
| `pulseTimeSeries(query)` | Fixed-width time bucket histogram |
| `pulseRank(query)` | Top-N ranking by aggregated score field |
| `getEventCount()` | Total ingested events |
| `clear()` | Reset event buffer |
| `destroy()` | Release all state |

## Dependencies

None. DuckDB integration deferred to a future phase.

## Design Decisions

- In-memory aggregate with bounded buffer -- events stored in an array capped at `maxEvents` (default 1M); oldest events evicted when full
- Federated scatter-gather via merge utilities -- each shard computes partial results locally; `mergePulseCountResults`/`mergePulseTimeSeriesResults`/`mergePulseRankResults` combine partials by summing counts/scores and re-ranking
- Filter-first pipeline -- `applyPulseFilter` runs before aggregation to reduce working set; supports type, labels (all-match), and time range predicates
- Rank uses aggregated scores -- `pulseRank` sums a configurable `scoreField` per soul, then sorts descending and assigns 1-based ranks
