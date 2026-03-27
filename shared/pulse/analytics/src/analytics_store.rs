use std::path::{Path, PathBuf};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;

use pulse_types::SignedEvent;

use crate::analytics_query::{AnalyticsQuery, AnalyticsResult, QueryKind};

#[derive(Debug, Error)]
pub enum AnalyticsStoreError {
    #[error("duckdb error: {0}")]
    DuckDb(String),
    #[error("query error: {0}")]
    Query(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone)]
struct AnalyticsEvent {
    pubkey: String,
    kind: u32,
    created_at: u64,
    tags: Vec<Vec<String>>,
}

/// DuckDB-backed analytics engine for columnar OLAP queries.
/// Handles event kinds 3000-3999 (views, reactions, shares, trades).
///
/// In production, events are appended to DuckDB columnar tables.
/// This implementation uses an in-memory store that mirrors
/// the DuckDB query patterns (count, timeseries, rank).
pub struct AnalyticsStore {
    data_dir: PathBuf,
    events: Arc<RwLock<Vec<AnalyticsEvent>>>,
}

impl AnalyticsStore {
    pub fn open(path: &Path) -> Result<Self, AnalyticsStoreError> {
        std::fs::create_dir_all(path)?;

        // In production: duckdb::Connection::open(path.join("analytics.duckdb"))
        // Then CREATE TABLE events (pubkey VARCHAR, kind INTEGER, created_at BIGINT, ...)
        Ok(Self {
            data_dir: path.to_path_buf(),
            events: Arc::new(RwLock::new(Vec::new())),
        })
    }

    pub async fn ingest(&self, event: &SignedEvent) -> Result<(), AnalyticsStoreError> {
        let record = AnalyticsEvent {
            pubkey: hex::encode(event.pubkey),
            kind: event.kind,
            created_at: event.created_at,
            tags: event.tags.clone(),
        };
        self.events.write().await.push(record);
        Ok(())
    }

    pub async fn query(
        &self,
        query: &AnalyticsQuery,
    ) -> Result<AnalyticsResult, AnalyticsStoreError> {
        let events = self.events.read().await;
        let filtered = Self::apply_filters(&events, query);

        match &query.kind {
            QueryKind::Count { group_by } => {
                let counts = Self::count_query(&filtered, group_by.as_deref());
                Ok(AnalyticsResult::Count(counts))
            }
            QueryKind::TimeSeries { bucket_seconds } => {
                let series = Self::timeseries_query(&filtered, *bucket_seconds);
                Ok(AnalyticsResult::TimeSeries(series))
            }
            QueryKind::Rank { limit } => {
                let ranked = Self::rank_query(&filtered, *limit);
                Ok(AnalyticsResult::Rank(ranked))
            }
        }
    }

    fn apply_filters<'a>(
        events: &'a [AnalyticsEvent],
        query: &AnalyticsQuery,
    ) -> Vec<&'a AnalyticsEvent> {
        events
            .iter()
            .filter(|e| {
                if let Some(kind) = query.filter_kind {
                    if e.kind != kind {
                        return false;
                    }
                }
                if let Some(since) = query.since {
                    if e.created_at < since {
                        return false;
                    }
                }
                if let Some(until) = query.until {
                    if e.created_at > until {
                        return false;
                    }
                }
                true
            })
            .collect()
    }

    fn count_query(
        events: &[&AnalyticsEvent],
        group_by: Option<&str>,
    ) -> Vec<(String, u64)> {
        use std::collections::HashMap;
        let mut counts: HashMap<String, u64> = HashMap::new();

        for event in events {
            let key = match group_by {
                Some("pubkey") => event.pubkey.clone(),
                Some("kind") => event.kind.to_string(),
                _ => "total".to_string(),
            };
            *counts.entry(key).or_insert(0) += 1;
        }

        let mut result: Vec<_> = counts.into_iter().collect();
        result.sort_by(|a, b| b.1.cmp(&a.1));
        result
    }

    fn timeseries_query(
        events: &[&AnalyticsEvent],
        bucket_seconds: u64,
    ) -> Vec<(u64, u64)> {
        use std::collections::BTreeMap;
        let mut buckets: BTreeMap<u64, u64> = BTreeMap::new();

        for event in events {
            let bucket = (event.created_at / bucket_seconds) * bucket_seconds;
            *buckets.entry(bucket).or_insert(0) += 1;
        }

        buckets.into_iter().collect()
    }

    fn rank_query(
        events: &[&AnalyticsEvent],
        limit: usize,
    ) -> Vec<(String, u64)> {
        use std::collections::HashMap;
        let mut scores: HashMap<String, u64> = HashMap::new();

        for event in events {
            if let Some(tag) = event.tags.first() {
                if tag.len() >= 2 {
                    *scores.entry(tag[1].clone()).or_insert(0) += 1;
                }
            }
        }

        let mut ranked: Vec<_> = scores.into_iter().collect();
        ranked.sort_by(|a, b| b.1.cmp(&a.1));
        ranked.truncate(limit);
        ranked
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_event(kind: u32, pubkey_byte: u8, created_at: u64) -> SignedEvent {
        SignedEvent {
            id: [0u8; 32],
            pubkey: [pubkey_byte; 32],
            created_at,
            kind,
            tags: vec![vec!["e".to_string(), "target_event_1".to_string()]],
            content: b"{}".to_vec(),
            sig: [0u8; 64],
        }
    }

    #[tokio::test]
    async fn count_query() {
        let dir = tempfile::tempdir().unwrap();
        let store = AnalyticsStore::open(dir.path()).unwrap();

        store.ingest(&make_event(3001, 1, 1000)).await.unwrap();
        store.ingest(&make_event(3001, 1, 2000)).await.unwrap();
        store.ingest(&make_event(3001, 2, 3000)).await.unwrap();

        let result = store
            .query(&AnalyticsQuery {
                filter_kind: Some(3001),
                since: None,
                until: None,
                kind: QueryKind::Count {
                    group_by: Some("pubkey".into()),
                },
            })
            .await
            .unwrap();

        if let AnalyticsResult::Count(counts) = result {
            assert_eq!(counts.len(), 2);
        } else {
            panic!("expected count result");
        }
    }
}
