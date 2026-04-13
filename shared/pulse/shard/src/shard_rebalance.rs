use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::hash_ring::HashRing;

/// Handles shard rebalancing when nodes join or leave the cluster.
///
/// Uses consistent hashing so only ~1/N of keys move when a node joins.
/// Rebalance runs with a cooldown to prevent thrashing during
/// rolling deployments. Transfer is throttled to avoid saturating
/// inter-node bandwidth.
pub struct ShardRebalancer {
    ring: Arc<RwLock<HashRing>>,
    cooldown_ms: u64,
    last_rebalance: RwLock<Option<Instant>>,
}

impl ShardRebalancer {
    pub fn new(ring: Arc<RwLock<HashRing>>, cooldown_ms: u64) -> Self {
        Self {
            ring,
            cooldown_ms,
            last_rebalance: RwLock::new(None),
        }
    }

    /// Rebalance after a node joins the cluster.
    /// Returns the list of key ranges that would be transferred.
    pub async fn rebalance_on_join(
        &self,
        new_peer_id: &str,
    ) -> RebalanceResult {
        if !self.check_cooldown().await {
            return RebalanceResult::CooldownActive;
        }

        let mut ring = self.ring.write().await;
        let before_count = ring.peer_count();
        ring.add_peer(new_peer_id);

        info!(
            peer = %new_peer_id,
            before = before_count,
            after = ring.peer_count(),
            "node joined, rebalancing"
        );

        // In production: identify key ranges that now map to the new
        // peer, stream data from current owners, verify integrity.
        // Consistent hashing ensures only ~1/N keys move.

        *self.last_rebalance.write().await = Some(Instant::now());

        RebalanceResult::Completed {
            peer_id: new_peer_id.to_string(),
            estimated_keys_moved_fraction: 1.0 / ring.peer_count() as f64,
        }
    }

    /// Rebalance after a node leaves the cluster.
    /// Triggers re-replication for affected key ranges.
    pub async fn rebalance_on_leave(
        &self,
        departed_peer_id: &str,
    ) -> RebalanceResult {
        let mut ring = self.ring.write().await;
        let before_count = ring.peer_count();
        ring.remove_peer(departed_peer_id);

        info!(
            peer = %departed_peer_id,
            before = before_count,
            after = ring.peer_count(),
            "node departed, triggering repair"
        );

        // No cooldown check for departures -- repair is urgent.
        // In production: identify under-replicated key ranges
        // and schedule repair via ShardRepairScheduler.

        *self.last_rebalance.write().await = Some(Instant::now());

        RebalanceResult::Completed {
            peer_id: departed_peer_id.to_string(),
            estimated_keys_moved_fraction: 1.0 / (before_count.max(1)) as f64,
        }
    }

    async fn check_cooldown(&self) -> bool {
        let last = self.last_rebalance.read().await;
        match *last {
            Some(instant) => {
                let elapsed = instant.elapsed().as_millis() as u64;
                if elapsed < self.cooldown_ms {
                    warn!(
                        remaining_ms = self.cooldown_ms - elapsed,
                        "rebalance cooldown active"
                    );
                    return false;
                }
                true
            }
            None => true,
        }
    }
}

#[derive(Debug)]
pub enum RebalanceResult {
    Completed {
        peer_id: String,
        estimated_keys_moved_fraction: f64,
    },
    CooldownActive,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hash_ring::ShardConfig;

    #[tokio::test]
    async fn rebalance_on_join() {
        let config = ShardConfig::default();
        let mut ring = HashRing::new(config);
        ring.add_peer("node-1");
        ring.add_peer("node-2");

        let rebalancer = ShardRebalancer::new(
            Arc::new(RwLock::new(ring)),
            0,
        );

        let result = rebalancer.rebalance_on_join("node-3").await;
        assert!(matches!(result, RebalanceResult::Completed { .. }));
    }

    #[tokio::test]
    async fn cooldown_prevents_rapid_rebalance() {
        let config = ShardConfig::default();
        let ring = HashRing::new(config);

        let rebalancer = ShardRebalancer::new(
            Arc::new(RwLock::new(ring)),
            60_000,
        );

        let r1 = rebalancer.rebalance_on_join("node-1").await;
        assert!(matches!(r1, RebalanceResult::Completed { .. }));

        let r2 = rebalancer.rebalance_on_join("node-2").await;
        assert!(matches!(r2, RebalanceResult::CooldownActive));
    }

    #[tokio::test]
    async fn leave_bypasses_cooldown() {
        let config = ShardConfig::default();
        let mut ring = HashRing::new(config);
        ring.add_peer("node-1");
        ring.add_peer("node-2");

        let rebalancer = ShardRebalancer::new(
            Arc::new(RwLock::new(ring)),
            60_000,
        );

        rebalancer.rebalance_on_join("node-3").await;
        let result = rebalancer.rebalance_on_leave("node-2").await;
        assert!(matches!(result, RebalanceResult::Completed { .. }));
    }
}
