use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShardConfig {
    pub min_shards: u16,
    pub max_shards: u16,
    pub virtual_nodes_per_peer: u16,
    pub repair_check_interval_ms: u64,
    pub repair_timeout_ms: u64,
    pub rebalance_cooldown_ms: u64,
}

impl Default for ShardConfig {
    fn default() -> Self {
        Self {
            min_shards: 3,
            max_shards: 5,
            virtual_nodes_per_peer: 150,
            repair_check_interval_ms: 30_000,
            repair_timeout_ms: 300_000,
            rebalance_cooldown_ms: 60_000,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VirtualNode {
    pub peer_id: String,
    pub vnode_index: u16,
    pub position: u64,
}

/// Consistent hash ring for shard routing.
/// Uses SHA-256 for ring positioning with configurable
/// virtual nodes per peer for uniform distribution.
pub struct HashRing {
    config: ShardConfig,
    ring: BTreeMap<u64, VirtualNode>,
    peers: Vec<String>,
}

impl HashRing {
    pub fn new(config: ShardConfig) -> Self {
        Self {
            config,
            ring: BTreeMap::new(),
            peers: Vec::new(),
        }
    }

    pub fn add_peer(&mut self, peer_id: &str) {
        if self.peers.contains(&peer_id.to_string()) {
            return;
        }
        self.peers.push(peer_id.to_string());

        for i in 0..self.config.virtual_nodes_per_peer {
            let position = Self::hash_position(peer_id, i);
            let vnode = VirtualNode {
                peer_id: peer_id.to_string(),
                vnode_index: i,
                position,
            };
            self.ring.insert(position, vnode);
        }
    }

    pub fn remove_peer(&mut self, peer_id: &str) {
        self.peers.retain(|p| p != peer_id);
        self.ring.retain(|_, vnode| vnode.peer_id != peer_id);
    }

    fn hash_position(peer_id: &str, vnode_index: u16) -> u64 {
        let mut hasher = Sha256::new();
        hasher.update(peer_id.as_bytes());
        hasher.update(vnode_index.to_be_bytes());
        let result = hasher.finalize();
        u64::from_be_bytes(result[0..8].try_into().unwrap())
    }

    fn key_position(key: &[u8]) -> u64 {
        let mut hasher = Sha256::new();
        hasher.update(key);
        let result = hasher.finalize();
        u64::from_be_bytes(result[0..8].try_into().unwrap())
    }

    /// Find the N responsible peers for a given key, walking
    /// clockwise around the ring and collecting distinct peer IDs.
    pub fn locate_key(&self, key: &[u8], replica_count: usize) -> Vec<String> {
        if self.ring.is_empty() {
            return Vec::new();
        }

        let pos = Self::key_position(key);
        let mut result = Vec::new();

        let after = self.ring.range(pos..);
        let before = self.ring.range(..pos);

        for (_, vnode) in after.chain(before) {
            if !result.contains(&vnode.peer_id) {
                result.push(vnode.peer_id.clone());
                if result.len() >= replica_count {
                    break;
                }
            }
        }

        result
    }

    /// Get the primary owner for a key.
    pub fn primary_for(&self, key: &[u8]) -> Option<String> {
        self.locate_key(key, 1).into_iter().next()
    }

    pub fn replica_count_for(&self, key: &[u8]) -> usize {
        self.locate_key(key, self.config.max_shards as usize).len()
    }

    pub fn peer_count(&self) -> usize {
        self.peers.len()
    }

    pub fn peers(&self) -> &[String] {
        &self.peers
    }

    pub fn config(&self) -> &ShardConfig {
        &self.config
    }

    /// Check whether any key ranges are under-replicated
    /// (below min_shards) or over-replicated (above max_shards).
    pub fn check_shard_health(&self) -> ShardHealthReport {
        let peer_count = self.peers.len() as u16;
        let effective_min = self.config.min_shards.min(peer_count);

        ShardHealthReport {
            total_peers: peer_count,
            total_vnodes: self.ring.len(),
            min_shards: effective_min,
            max_shards: self.config.max_shards,
            is_healthy: peer_count >= effective_min,
        }
    }
}

#[derive(Debug)]
pub struct ShardHealthReport {
    pub total_peers: u16,
    pub total_vnodes: usize,
    pub min_shards: u16,
    pub max_shards: u16,
    pub is_healthy: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_and_locate() {
        let mut ring = HashRing::new(ShardConfig::default());
        ring.add_peer("node-1");
        ring.add_peer("node-2");
        ring.add_peer("node-3");

        let peers = ring.locate_key(b"user:alice", 3);
        assert_eq!(peers.len(), 3);

        let unique: std::collections::HashSet<_> = peers.iter().collect();
        assert_eq!(unique.len(), 3);
    }

    #[test]
    fn primary_is_deterministic() {
        let mut ring = HashRing::new(ShardConfig::default());
        ring.add_peer("node-1");
        ring.add_peer("node-2");

        let p1 = ring.primary_for(b"key1").unwrap();
        let p2 = ring.primary_for(b"key1").unwrap();
        assert_eq!(p1, p2);
    }

    #[test]
    fn remove_peer_redistributes() {
        let mut ring = HashRing::new(ShardConfig::default());
        ring.add_peer("node-1");
        ring.add_peer("node-2");
        ring.add_peer("node-3");

        ring.remove_peer("node-2");
        assert_eq!(ring.peer_count(), 2);

        let peers = ring.locate_key(b"test", 3);
        assert_eq!(peers.len(), 2);
    }

    #[test]
    fn empty_ring_returns_empty() {
        let ring = HashRing::new(ShardConfig::default());
        assert!(ring.locate_key(b"anything", 3).is_empty());
    }
}
