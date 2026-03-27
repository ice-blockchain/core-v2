use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MergeStrategy {
    SumCounts,
    SumTimeSeries,
    ReRank { limit: usize },
    VectorReRank { top_k: usize },
}

#[derive(Debug, Clone)]
pub struct PartialResult {
    pub shard_id: String,
    pub counts: Vec<(String, u64)>,
    pub timeseries: Vec<(u64, u64)>,
    pub ranked: Vec<(String, f64)>,
}

/// Merge count results from multiple shards by summing counts per key.
pub fn merge_counts(partials: &[PartialResult]) -> Vec<(String, u64)> {
    let mut merged: HashMap<String, u64> = HashMap::new();
    for partial in partials {
        for (key, count) in &partial.counts {
            *merged.entry(key.clone()).or_insert(0) += count;
        }
    }
    let mut result: Vec<_> = merged.into_iter().collect();
    result.sort_by(|a, b| b.1.cmp(&a.1));
    result
}

/// Merge time-series buckets by summing counts per time bucket.
pub fn merge_timeseries(partials: &[PartialResult]) -> Vec<(u64, u64)> {
    let mut merged: HashMap<u64, u64> = HashMap::new();
    for partial in partials {
        for (bucket, count) in &partial.timeseries {
            *merged.entry(*bucket).or_insert(0) += count;
        }
    }
    let mut result: Vec<_> = merged.into_iter().collect();
    result.sort_by_key(|(bucket, _)| *bucket);
    result
}

/// Merge vector search results from multiple shards.
/// Collects top-K candidates from each shard and re-ranks
/// globally by distance, returning the overall top-K.
pub fn merge_vectors(
    partials: &[PartialResult],
    top_k: usize,
) -> Vec<(String, f64)> {
    let mut all: Vec<(String, f64)> = Vec::new();
    for partial in partials {
        all.extend(partial.ranked.iter().cloned());
    }
    // Lower distance = better match, so sort ascending
    all.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
    all.truncate(top_k);
    all
}

/// Merge ranked results by summing scores, re-sorting, and applying limit.
pub fn merge_ranked(
    partials: &[PartialResult],
    limit: usize,
) -> Vec<(String, f64)> {
    let mut merged: HashMap<String, f64> = HashMap::new();
    for partial in partials {
        for (key, score) in &partial.ranked {
            *merged.entry(key.clone()).or_insert(0.0) += score;
        }
    }
    let mut result: Vec<_> = merged.into_iter().collect();
    result.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    result.truncate(limit);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_counts_across_shards() {
        let partials = vec![
            PartialResult {
                shard_id: "s1".into(),
                counts: vec![("alice".into(), 10), ("bob".into(), 5)],
                timeseries: vec![],
                ranked: vec![],
            },
            PartialResult {
                shard_id: "s2".into(),
                counts: vec![("alice".into(), 7), ("carol".into(), 3)],
                timeseries: vec![],
                ranked: vec![],
            },
        ];
        let merged = merge_counts(&partials);
        assert_eq!(merged[0], ("alice".into(), 17));
    }

    #[test]
    fn merge_timeseries_across_shards() {
        let partials = vec![
            PartialResult {
                shard_id: "s1".into(),
                counts: vec![],
                timeseries: vec![(1000, 5), (2000, 3)],
                ranked: vec![],
            },
            PartialResult {
                shard_id: "s2".into(),
                counts: vec![],
                timeseries: vec![(1000, 2), (3000, 1)],
                ranked: vec![],
            },
        ];
        let merged = merge_timeseries(&partials);
        assert_eq!(merged, vec![(1000, 7), (2000, 3), (3000, 1)]);
    }

    #[test]
    fn merge_ranked_with_limit() {
        let partials = vec![
            PartialResult {
                shard_id: "s1".into(),
                counts: vec![],
                timeseries: vec![],
                ranked: vec![("a".into(), 10.0), ("b".into(), 8.0), ("c".into(), 1.0)],
            },
            PartialResult {
                shard_id: "s2".into(),
                counts: vec![],
                timeseries: vec![],
                ranked: vec![("b".into(), 5.0), ("d".into(), 12.0)],
            },
        ];
        let merged = merge_ranked(&partials, 2);
        assert_eq!(merged.len(), 2);
        assert_eq!(merged[0].0, "b"); // 8 + 5 = 13
        assert_eq!(merged[1].0, "d"); // 12
    }

    #[test]
    fn merge_vectors_picks_nearest() {
        let partials = vec![
            PartialResult {
                shard_id: "s1".into(),
                counts: vec![],
                timeseries: vec![],
                ranked: vec![("v1".into(), 0.1), ("v2".into(), 0.5)],
            },
            PartialResult {
                shard_id: "s2".into(),
                counts: vec![],
                timeseries: vec![],
                ranked: vec![("v3".into(), 0.05), ("v4".into(), 0.3)],
            },
        ];
        let merged = merge_vectors(&partials, 2);
        assert_eq!(merged.len(), 2);
        assert_eq!(merged[0].0, "v3"); // 0.05 closest
        assert_eq!(merged[1].0, "v1"); // 0.1 second closest
    }
}
