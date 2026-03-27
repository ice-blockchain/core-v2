# pulse-shard

Consistent hash ring with configurable min/max shard bounds, auto-repair for under-replicated ranges, auto-cleanup for over-replicated ranges, and rebalance on node join/leave.

## Crate

`pulse-shard` -- `shared/pulse/shard/`

## Dependencies

- `sha2` (SHA-256 for ring positioning)
- `sodiumoxide` (shared with Auth)
- `tokio` (async repair scheduler)
- `pulse-types`

## API

```rust
pub struct HashRing { .. }
impl HashRing {
    pub fn new(config: ShardConfig) -> Self;
    pub fn add_peer(&mut self, peer_id: &str);
    pub fn remove_peer(&mut self, peer_id: &str);
    pub fn locate_key(&self, key: &[u8], replica_count: usize) -> Vec<String>;
    pub fn primary_for(&self, key: &[u8]) -> Option<String>;
    pub fn check_shard_health(&self) -> ShardHealthReport;
}

pub struct PeerHealth { .. }
impl PeerHealth {
    pub fn record_heartbeat(&mut self, peer_id: &str);
    pub fn record_failure(&mut self, peer_id: &str);
    pub fn check_all(&mut self);
    pub fn healthy_peers(&self) -> Vec<String>;
    pub fn down_peers(&self) -> Vec<String>;
}

pub struct ShardRepairScheduler { .. }
impl ShardRepairScheduler {
    pub async fn run(&self);
    pub async fn handle_join(&self, peer_id: &str);
    pub async fn handle_leave(&self, peer_id: &str);
}

pub struct ShardCleanup { .. }
impl ShardCleanup {
    pub fn new(ring: Arc<RwLock<HashRing>>, drain_timeout_ms: u64) -> Self;
    pub async fn cleanup_excess_replicas(&self, key: &[u8]) -> CleanupResult;
}

pub struct ShardRebalancer { .. }
impl ShardRebalancer {
    pub fn new(ring: Arc<RwLock<HashRing>>, cooldown_ms: u64) -> Self;
    pub async fn rebalance_on_join(&self, new_peer_id: &str) -> RebalanceResult;
    pub async fn rebalance_on_leave(&self, departed_peer_id: &str) -> RebalanceResult;
}
```

## Config Defaults

| Setting | Default |
|---------|---------|
| `min_shards` | 3 |
| `max_shards` | 5 |
| `virtual_nodes_per_peer` | 150 |
| `repair_check_interval_ms` | 30,000 |
| `repair_timeout_ms` | 300,000 |
| `rebalance_cooldown_ms` | 60,000 |

## Repair Conditions

| Condition | Action |
|-----------|--------|
| `replicas < min_shards` | Auto-repair: copy from healthy replica to next peer |
| `replicas > max_shards` | Auto-cleanup: decommission excess replicas |
| `replicas == 0` | Alert: emit critical health event |
| Node joins | Rebalance: transfer key ranges to new node |
| Node leaves | Repair: re-replicate affected ranges |

## Peer Health States

`Healthy` -> `Suspect` (missed heartbeats) -> `Down` (3+ consecutive failures)

## Files

| File | Purpose |
|------|---------|
| `src/hash_ring.rs` | HashRing, ShardConfig, VirtualNode, key location |
| `src/peer_health.rs` | PeerHealth, heartbeat tracking, status transitions |
| `src/shard_repair.rs` | ShardRepairScheduler, periodic health check, join/leave |
| `src/shard_cleanup.rs` | ShardCleanup, over-replicated range detection, excess decommission |
| `src/shard_rebalance.rs` | ShardRebalancer, join/leave rebalancing, cooldown enforcement |
