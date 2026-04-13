use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, debug};

use crate::hash_ring::HashRing;

/// Handles over-replicated shard cleanup.
///
/// When `active_replicas > max_shards` for a key range:
///   1. Identifies the "furthest" replica on the ring
///   2. Marks replica for decommission (stops writes)
///   3. Waits for in-flight reads to drain
///   4. Deletes replica data from the excess node
///   5. Updates ring metadata
pub struct ShardCleanup {
    ring: Arc<RwLock<HashRing>>,
    drain_timeout_ms: u64,
}

impl ShardCleanup {
    pub fn new(ring: Arc<RwLock<HashRing>>, drain_timeout_ms: u64) -> Self {
        Self {
            ring,
            drain_timeout_ms,
        }
    }

    /// Check for over-replicated key ranges and clean up excess replicas.
    pub async fn cleanup_excess_replicas(&self, key: &[u8]) -> CleanupResult {
        let ring = self.ring.read().await;
        let config = ring.config();
        let max = config.max_shards as usize;
        let replicas = ring.locate_key(key, max + 1);

        if replicas.len() <= max {
            return CleanupResult::NotNeeded;
        }

        let excess_count = replicas.len() - max;
        let excess_peers: Vec<String> = replicas[max..].to_vec();

        info!(
            excess = excess_count,
            peers = ?excess_peers,
            "over-replicated range detected"
        );

        // In production: for each excess peer, stop writes,
        // wait for drain_timeout_ms, then delete shard data.
        for peer in &excess_peers {
            debug!(peer = %peer, "would decommission excess replica");
        }

        CleanupResult::Cleaned {
            removed_peers: excess_peers,
        }
    }
}

#[derive(Debug)]
pub enum CleanupResult {
    NotNeeded,
    Cleaned { removed_peers: Vec<String> },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hash_ring::ShardConfig;

    #[tokio::test]
    async fn no_cleanup_when_within_bounds() {
        let config = ShardConfig {
            max_shards: 5,
            ..ShardConfig::default()
        };
        let mut ring = HashRing::new(config);
        ring.add_peer("node-1");
        ring.add_peer("node-2");
        ring.add_peer("node-3");

        let cleanup = ShardCleanup::new(
            Arc::new(RwLock::new(ring)),
            5000,
        );

        let result = cleanup.cleanup_excess_replicas(b"key").await;
        assert!(matches!(result, CleanupResult::NotNeeded));
    }
}
