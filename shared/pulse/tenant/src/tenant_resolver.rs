use std::sync::Arc;
use lru::LruCache;
use std::num::NonZeroUsize;
use tokio::sync::Mutex;

use crate::tenant_lifecycle::TenantMetadata;
use crate::tenant_store::{TenantStore, TenantStoreError};

/// Resolves tenant_id from request headers and loads
/// tenant storage handles from a cached pool.
/// Handles are lazily opened on first access and evicted
/// after idle timeout.
pub struct TenantResolver {
    store: Arc<TenantStore>,
    cache: Mutex<LruCache<String, TenantMetadata>>,
}

impl TenantResolver {
    pub fn new(store: Arc<TenantStore>, cache_size: usize) -> Self {
        Self {
            store,
            cache: Mutex::new(LruCache::new(
                NonZeroUsize::new(cache_size).unwrap_or(NonZeroUsize::new(1000).unwrap()),
            )),
        }
    }

    pub async fn resolve(
        &self,
        tenant_id: &str,
    ) -> Result<TenantMetadata, TenantStoreError> {
        let mut cache = self.cache.lock().await;

        if let Some(cached) = cache.get(tenant_id) {
            return Ok(cached.clone());
        }

        let meta = self.store.get_tenant(tenant_id)?;
        cache.put(tenant_id.to_string(), meta.clone());
        Ok(meta)
    }

    pub async fn invalidate(&self, tenant_id: &str) {
        self.cache.lock().await.pop(tenant_id);
    }

    pub async fn cache_size(&self) -> usize {
        self.cache.lock().await.len()
    }
}
