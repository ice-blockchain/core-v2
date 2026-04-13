# pulse-analytics

Columnar analytics engine on DuckDB for OLAP queries over event data (kinds 3000-3999).

## Crate

`pulse-analytics` -- `shared/pulse/analytics/`

## Dependencies

- `duckdb` 1.1+ (C++ columnar OLAP, compiled from source)
- `pulse-types` (SignedEvent)

## API

```rust
pub struct AnalyticsStore { .. }
impl AnalyticsStore {
    pub fn open(path: &Path) -> Result<Self, AnalyticsStoreError>;
    pub async fn ingest(&self, event: &SignedEvent) -> Result<(), AnalyticsStoreError>;
    pub async fn query(&self, query: &AnalyticsQuery) -> Result<AnalyticsResult, AnalyticsStoreError>;
}

pub enum QueryKind {
    Count { group_by: Option<String> },
    TimeSeries { bucket_seconds: u64 },
    Rank { limit: usize },
}

pub enum AnalyticsResult {
    Count(Vec<(String, u64)>),
    TimeSeries(Vec<(u64, u64)>),
    Rank(Vec<(String, u64)>),
}
```

## Query Patterns

| Query | SQL Equivalent |
|-------|---------------|
| Count by user | `SELECT pubkey, COUNT(*) FROM events WHERE kind=? GROUP BY pubkey` |
| Time series | `SELECT time_bucket(?, created_at), COUNT(*) FROM events GROUP BY 1` |
| Trending rank | `SELECT target, COUNT(*) FROM events GROUP BY target ORDER BY 2 DESC LIMIT ?` |

## Files

| File | Purpose |
|------|---------|
| `src/analytics_store.rs` | AnalyticsStore, ingestion, query execution |
| `src/analytics_query.rs` | AnalyticsQuery, QueryKind, AnalyticsResult types |
