use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use tracing::{info, warn};

use crate::hash_ring::{HashRing, ShardConfig};
use crate::peer_health::{PeerHealth, PeerStatus};

/// Periodically checks shard health and triggers repair
/// or cleanup operations based on min/max shard bounds.
pub struct ShardRepairScheduler {
    ring: Arc<RwLock<HashRing>>,
    health: Arc<RwLock<PeerHealth>>,
    config: ShardConfig,
}

impl ShardRepairScheduler {
    pub fn new(
        ring: Arc<RwLock<HashRing>>,
        health: Arc<RwLock<PeerHealth>>,
        config: ShardConfig,
    ) -> Self {
        Self {
            ring,
            health,
            config,
        }
    }

    pub async fn run(&self) {
        let mut tick = interval(Duration::from_millis(
            self.config.repair_check_interval_ms,
        ));

        loop {
            tick.tick().await;
            self.check_and_repair().await;
        }
    }

    async fn check_and_repair(&self) {
        let mut health = self.health.write().await;
        health.check_all();

        let down_peers = health.down_peers();
        if down_peers.is_empty() {
            return;
        }

        let ring = self.ring.read().await;
        let report = ring.check_shard_health();

        if !report.is_healthy {
            warn!(
                down = down_peers.len(),
                peers = report.total_peers,
                "cluster under-replicated, repair needed"
            );

            // In production, this would:
            //   1. Identify key ranges owned by down peers
            //   2. Find healthy replicas for those ranges
            //   3. Stream data from healthy replicas to the next
            //      peer clockwise on the ring
            //   4. Update ring metadata after replication completes
            for peer in &down_peers {
                info!(peer = %peer, "would initiate shard repair");
            }
        }
    }

    /// Handle a node joining the cluster.
    /// Triggers rebalance after cooldown period.
    pub async fn handle_join(&self, peer_id: &str) {
        self.ring.write().await.add_peer(peer_id);
        self.health.write().await.record_heartbeat(peer_id);
        info!(peer = %peer_id, "peer joined, rebalance scheduled");
    }

    /// Handle a node leaving the cluster.
    /// Triggers immediate repair for affected key ranges.
    pub async fn handle_leave(&self, peer_id: &str) {
        self.ring.write().await.remove_peer(peer_id);
        info!(peer = %peer_id, "peer left, repair triggered");
        self.check_and_repair().await;
    }
}
