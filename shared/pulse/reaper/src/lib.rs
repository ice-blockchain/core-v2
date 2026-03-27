use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::sync::RwLock;
use tokio::time::interval;
use tracing::{info, warn};

#[derive(Debug, Error)]
pub enum ReaperError {
    #[error("erasure failed for key {key}: {reason}")]
    ErasureFailed { key: String, reason: String },
    #[error("sweep error: {0}")]
    SweepError(String),
}

#[derive(Debug, Clone)]
pub struct Tombstone {
    pub key: String,
    pub deleted_at: u64,
    pub ttl_seconds: u64,
    pub tenant_id: String,
}

impl Tombstone {
    pub fn is_expired(&self, now: u64) -> bool {
        now >= self.deleted_at + self.ttl_seconds
    }
}

/// Storage engine trait for reaper to clear data from.
pub trait ReaperStorage: Send + Sync {
    fn engine_name(&self) -> &str;
    fn erase(&self, tenant_id: &str, key: &str) -> Result<(), String>;
}

/// GC sweeps, tombstone TTL management, and GDPR hard erasure.
///
/// - Tombstone soft delete with configurable TTL (default 30 days)
/// - GDPR hard erasure with fan-out to all storage engines
/// - Auto-sweep on configurable interval
pub struct Reaper {
    tombstones: Arc<RwLock<Vec<Tombstone>>>,
    default_ttl_seconds: u64,
    sweep_interval_ms: u64,
    storage_engines: Arc<RwLock<Vec<Box<dyn ReaperStorage>>>>,
}

impl Reaper {
    pub fn new(default_ttl_seconds: u64, sweep_interval_ms: u64) -> Self {
        Self {
            tombstones: Arc::new(RwLock::new(Vec::new())),
            default_ttl_seconds,
            sweep_interval_ms,
            storage_engines: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn register_storage(&self, engine: Box<dyn ReaperStorage>) {
        self.storage_engines.write().await.push(engine);
    }

    /// Mark a key for soft deletion with TTL.
    pub async fn soft_delete(
        &self,
        tenant_id: &str,
        key: &str,
        ttl_seconds: Option<u64>,
    ) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let tombstone = Tombstone {
            key: key.to_string(),
            deleted_at: now,
            ttl_seconds: ttl_seconds.unwrap_or(self.default_ttl_seconds),
            tenant_id: tenant_id.to_string(),
        };

        self.tombstones.write().await.push(tombstone);
    }

    /// GDPR hard erasure: immediately delete from all storage engines.
    pub async fn hard_erase(
        &self,
        tenant_id: &str,
        key: &str,
    ) -> Result<(), ReaperError> {
        let engines = self.storage_engines.read().await;
        let mut errors = Vec::new();

        for engine in engines.iter() {
            if let Err(e) = engine.erase(tenant_id, key) {
                warn!(
                    engine = engine.engine_name(),
                    key = %key,
                    error = %e,
                    "erasure failed"
                );
                errors.push(e);
            }
        }

        // Also remove any tombstone for this key
        self.tombstones
            .write()
            .await
            .retain(|t| !(t.tenant_id == tenant_id && t.key == key));

        if errors.is_empty() {
            info!(tenant = %tenant_id, key = %key, "GDPR erasure complete");
            Ok(())
        } else {
            Err(ReaperError::ErasureFailed {
                key: key.to_string(),
                reason: errors.join("; "),
            })
        }
    }

    /// Sweep expired tombstones and permanently delete their data.
    pub async fn sweep(&self) -> Result<usize, ReaperError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut tombstones = self.tombstones.write().await;
        let (expired, remaining): (Vec<_>, Vec<_>) =
            tombstones.drain(..).partition(|t| t.is_expired(now));
        *tombstones = remaining;
        drop(tombstones);

        let mut erased = 0;
        for tombstone in &expired {
            if self
                .hard_erase(&tombstone.tenant_id, &tombstone.key)
                .await
                .is_ok()
            {
                erased += 1;
            }
        }

        if erased > 0 {
            info!(erased = erased, "sweep completed");
        }

        Ok(erased)
    }

    /// Run the periodic sweep loop.
    pub async fn run(&self) {
        let mut tick = interval(Duration::from_millis(self.sweep_interval_ms));
        loop {
            tick.tick().await;
            if let Err(e) = self.sweep().await {
                warn!("sweep error: {}", e);
            }
        }
    }

    pub async fn tombstone_count(&self) -> usize {
        self.tombstones.read().await.len()
    }
}

impl Default for Reaper {
    fn default() -> Self {
        Self::new(30 * 24 * 3600, 60_000) // 30 days TTL, 1 min sweep
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockStorage;
    impl ReaperStorage for MockStorage {
        fn engine_name(&self) -> &str {
            "mock"
        }
        fn erase(&self, _tenant_id: &str, _key: &str) -> Result<(), String> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn soft_delete_creates_tombstone() {
        let reaper = Reaper::new(30, 1000);
        reaper.soft_delete("t1", "event:123", None).await;
        assert_eq!(reaper.tombstone_count().await, 1);
    }

    #[tokio::test]
    async fn hard_erase_removes_from_engines() {
        let reaper = Reaper::new(30, 1000);
        reaper
            .register_storage(Box::new(MockStorage))
            .await;
        reaper.soft_delete("t1", "event:123", None).await;

        reaper.hard_erase("t1", "event:123").await.unwrap();
        assert_eq!(reaper.tombstone_count().await, 0);
    }

    #[tokio::test]
    async fn sweep_removes_expired_tombstones() {
        let reaper = Reaper::new(0, 1000); // 0 TTL = immediately expired
        reaper
            .register_storage(Box::new(MockStorage))
            .await;

        reaper.soft_delete("t1", "k1", Some(0)).await;
        // Small delay to ensure the tombstone registers as expired
        tokio::time::sleep(Duration::from_millis(10)).await;

        let erased = reaper.sweep().await.unwrap();
        assert_eq!(erased, 1);
        assert_eq!(reaper.tombstone_count().await, 0);
    }
}
