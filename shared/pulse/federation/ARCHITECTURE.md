# pulse-federation

Scatter-gather coordinator for federated queries that span all shards. Sends partial queries to each shard in parallel, collects results, and merges using configurable strategies.

## Crate

`pulse-federation` -- `shared/pulse/federation/`

## Dependencies

- `tokio` (parallel scatter, timeout)
- `pulse-types`

## API

```rust
pub struct FederatedCoordinator { .. }
impl FederatedCoordinator {
    pub fn new(default_timeout_ms: u64) -> Self;
    pub async fn execute(&self, query: &FederatedQuery) -> Result<Vec<PartialResult>, FederationError>;
}

pub fn merge_counts(partials: &[PartialResult]) -> Vec<(String, u64)>;
pub fn merge_timeseries(partials: &[PartialResult]) -> Vec<(u64, u64)>;
pub fn merge_ranked(partials: &[PartialResult], limit: usize) -> Vec<(String, f64)>;
pub fn merge_vectors(partials: &[PartialResult], top_k: usize) -> Vec<(String, f64)>;
```

## Merge Strategies

| Strategy | Operation |
|----------|-----------|
| `SumCounts` | Sum counts per key across shards |
| `SumTimeSeries` | Sum counts per time bucket |
| `ReRank` | Sum scores, re-sort, apply limit |
| `VectorReRank` | Collect top-K per shard, re-rank by distance |

## Config Defaults

| Setting | Default |
|---------|---------|
| `default_timeout_ms` | 10,000 |

## Files

| File | Purpose |
|------|---------|
| `src/scatter_gather.rs` | FederatedCoordinator, parallel shard dispatch |
| `src/merge.rs` | merge_counts, merge_timeseries, merge_ranked, merge_vectors |
