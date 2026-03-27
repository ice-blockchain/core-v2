# pulse-reaper

GC sweeps, tombstone TTL management, and GDPR hard erasure with fan-out to all registered storage engines.

## Crate

`pulse-reaper` -- `shared/pulse/reaper/`

## Dependencies

- `tokio` (periodic sweep, JoinSet for fan-out)
- `pulse-types`

## API

```rust
pub struct Reaper { .. }
impl Reaper {
    pub fn new(default_ttl_seconds: u64, sweep_interval_ms: u64) -> Self;
    pub async fn register_storage(&self, engine: Box<dyn ReaperStorage>);
    pub async fn soft_delete(&self, tenant_id: &str, key: &str, ttl_seconds: Option<u64>);
    pub async fn hard_erase(&self, tenant_id: &str, key: &str) -> Result<(), ReaperError>;
    pub async fn sweep(&self) -> Result<usize, ReaperError>;
    pub async fn run(&self);  // periodic sweep loop
}

pub trait ReaperStorage: Send + Sync {
    fn engine_name(&self) -> &str;
    fn erase(&self, tenant_id: &str, key: &str) -> Result<(), String>;
}
```

## Deletion Flow

1. **Soft delete**: Creates tombstone with TTL (default 30 days)
2. **Sweep**: Periodically checks tombstones, hard-erases expired ones
3. **Hard erase (GDPR)**: Immediately deletes from all registered storage engines, removes tombstone

## Config Defaults

| Setting | Default |
|---------|---------|
| `default_ttl_seconds` | 2,592,000 (30 days) |
| `sweep_interval_ms` | 60,000 (1 min) |

## Files

| File | Purpose |
|------|---------|
| `src/lib.rs` | Reaper, Tombstone, ReaperStorage trait, sweep loop |
