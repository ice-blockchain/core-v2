use std::time::Duration;
use thiserror::Error;
use tokio::time::timeout;
use tracing::{info, warn};

use crate::merge::{MergeStrategy, PartialResult};

#[derive(Debug, Error)]
pub enum FederationError {
    #[error("no shards available")]
    NoShards,
    #[error("scatter timeout after {0}ms")]
    Timeout(u64),
    #[error("all shards failed")]
    AllShardsFailed,
    #[error("merge error: {0}")]
    MergeError(String),
}

#[derive(Debug, Clone)]
pub struct FederatedQuery {
    pub query_id: String,
    pub sql: String,
    pub merge_strategy: MergeStrategy,
    pub timeout_ms: u64,
    pub shard_targets: Vec<String>,
}

/// Scatter-gather coordinator for federated queries
/// that span multiple shards. Sends partial queries to
/// each shard in parallel, collects results, and merges
/// using the specified strategy.
pub struct FederatedCoordinator {
    default_timeout_ms: u64,
}

impl FederatedCoordinator {
    pub fn new(default_timeout_ms: u64) -> Self {
        Self { default_timeout_ms }
    }

    pub async fn execute(
        &self,
        query: &FederatedQuery,
    ) -> Result<Vec<PartialResult>, FederationError> {
        if query.shard_targets.is_empty() {
            return Err(FederationError::NoShards);
        }

        let timeout_ms = if query.timeout_ms > 0 {
            query.timeout_ms
        } else {
            self.default_timeout_ms
        };

        info!(
            query_id = %query.query_id,
            shards = query.shard_targets.len(),
            "scattering federated query"
        );

        let results = timeout(
            Duration::from_millis(timeout_ms),
            self.scatter(&query.shard_targets, &query.sql),
        )
        .await
        .map_err(|_| FederationError::Timeout(timeout_ms))?;

        if results.is_empty() {
            return Err(FederationError::AllShardsFailed);
        }

        info!(
            query_id = %query.query_id,
            collected = results.len(),
            "gathering partial results"
        );

        Ok(results)
    }

    async fn scatter(
        &self,
        shard_targets: &[String],
        _sql: &str,
    ) -> Vec<PartialResult> {
        let mut handles = Vec::new();

        for shard_id in shard_targets {
            let shard = shard_id.clone();
            handles.push(tokio::spawn(async move {
                // In production, this would send the partial query
                // to the target shard over ADNL and collect results.
                // For now, return an empty result per shard.
                PartialResult {
                    shard_id: shard,
                    counts: Vec::new(),
                    timeseries: Vec::new(),
                    ranked: Vec::new(),
                }
            }));
        }

        let mut results = Vec::new();
        for handle in handles {
            match handle.await {
                Ok(result) => results.push(result),
                Err(e) => warn!("shard query failed: {}", e),
            }
        }
        results
    }
}

impl Default for FederatedCoordinator {
    fn default() -> Self {
        Self::new(10_000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn scatter_to_multiple_shards() {
        let coord = FederatedCoordinator::new(5000);
        let query = FederatedQuery {
            query_id: "q1".to_string(),
            sql: "SELECT count(*) FROM events".to_string(),
            merge_strategy: MergeStrategy::SumCounts,
            timeout_ms: 5000,
            shard_targets: vec!["shard-1".into(), "shard-2".into(), "shard-3".into()],
        };

        let results = coord.execute(&query).await.unwrap();
        assert_eq!(results.len(), 3);
    }

    #[tokio::test]
    async fn no_shards_returns_error() {
        let coord = FederatedCoordinator::new(5000);
        let query = FederatedQuery {
            query_id: "q2".to_string(),
            sql: "SELECT 1".to_string(),
            merge_strategy: MergeStrategy::SumCounts,
            timeout_ms: 1000,
            shard_targets: vec![],
        };

        assert!(coord.execute(&query).await.is_err());
    }
}
