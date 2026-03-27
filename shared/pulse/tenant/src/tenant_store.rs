use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use thiserror::Error;
use uuid::Uuid;

use crate::tenant_lifecycle::{TenantMetadata, TenantState};
use crate::tenant_quota::TenantQuota;

#[derive(Debug, Error)]
pub enum TenantStoreError {
    #[error("tenant not found: {0}")]
    NotFound(String),
    #[error("tenant suspended: {0}")]
    Suspended(String),
    #[error("tenant already exists: {0}")]
    AlreadyExists(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("lock poisoned")]
    LockPoisoned,
}

/// Manages tenant lifecycle and storage isolation.
/// Each tenant gets its own directory tree:
///   data/tenants/{tenant_id}/lmdb/
///   data/tenants/{tenant_id}/duckdb/
///   data/tenants/{tenant_id}/lance/
pub struct TenantStore {
    data_dir: PathBuf,
    tenants: RwLock<HashMap<String, TenantMetadata>>,
}

impl TenantStore {
    pub fn new(data_dir: &Path) -> Result<Self, TenantStoreError> {
        std::fs::create_dir_all(data_dir.join("tenants"))?;
        std::fs::create_dir_all(data_dir.join("global"))?;

        Ok(Self {
            data_dir: data_dir.to_path_buf(),
            tenants: RwLock::new(HashMap::new()),
        })
    }

    pub fn create_tenant(
        &self,
        admin_pubkey: [u8; 32],
        quota: Option<TenantQuota>,
    ) -> Result<String, TenantStoreError> {
        let tenant_id = Uuid::new_v4().to_string();
        let tenant_dir = self.tenant_dir(&tenant_id);

        std::fs::create_dir_all(tenant_dir.join("lmdb"))?;
        std::fs::create_dir_all(tenant_dir.join("duckdb"))?;
        std::fs::create_dir_all(tenant_dir.join("lance"))?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let metadata = TenantMetadata {
            tenant_id: tenant_id.clone(),
            state: TenantState::Active,
            admin_pubkey,
            quota: quota.unwrap_or_default(),
            created_at: now,
            updated_at: now,
        };

        let meta_json = serde_json::to_string_pretty(&metadata)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(self.tenant_dir(&tenant_id).join("meta.json"), meta_json)?;

        self.tenants
            .write()
            .map_err(|_| TenantStoreError::LockPoisoned)?
            .insert(tenant_id.clone(), metadata);

        Ok(tenant_id)
    }

    pub fn get_tenant(
        &self,
        tenant_id: &str,
    ) -> Result<TenantMetadata, TenantStoreError> {
        self.tenants
            .read()
            .map_err(|_| TenantStoreError::LockPoisoned)?
            .get(tenant_id)
            .cloned()
            .ok_or_else(|| TenantStoreError::NotFound(tenant_id.to_string()))
    }

    pub fn suspend_tenant(&self, tenant_id: &str) -> Result<(), TenantStoreError> {
        let mut tenants = self
            .tenants
            .write()
            .map_err(|_| TenantStoreError::LockPoisoned)?;

        let meta = tenants
            .get_mut(tenant_id)
            .ok_or_else(|| TenantStoreError::NotFound(tenant_id.to_string()))?;

        meta.state = TenantState::Suspended;
        meta.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(())
    }

    pub fn delete_tenant(&self, tenant_id: &str) -> Result<(), TenantStoreError> {
        let mut tenants = self
            .tenants
            .write()
            .map_err(|_| TenantStoreError::LockPoisoned)?;

        let meta = tenants
            .get_mut(tenant_id)
            .ok_or_else(|| TenantStoreError::NotFound(tenant_id.to_string()))?;

        meta.state = TenantState::Deleting;

        let tenant_dir = self.tenant_dir(tenant_id);
        if tenant_dir.exists() {
            std::fs::remove_dir_all(&tenant_dir)?;
        }

        meta.state = TenantState::Deleted;
        Ok(())
    }

    pub fn list_active_tenants(&self) -> Result<Vec<String>, TenantStoreError> {
        let tenants = self
            .tenants
            .read()
            .map_err(|_| TenantStoreError::LockPoisoned)?;

        Ok(tenants
            .values()
            .filter(|m| m.state == TenantState::Active)
            .map(|m| m.tenant_id.clone())
            .collect())
    }

    pub fn tenant_dir(&self, tenant_id: &str) -> PathBuf {
        self.data_dir.join("tenants").join(tenant_id)
    }

    pub fn lmdb_dir(&self, tenant_id: &str) -> PathBuf {
        self.tenant_dir(tenant_id).join("lmdb")
    }

    pub fn duckdb_dir(&self, tenant_id: &str) -> PathBuf {
        self.tenant_dir(tenant_id).join("duckdb")
    }

    pub fn lance_dir(&self, tenant_id: &str) -> PathBuf {
        self.tenant_dir(tenant_id).join("lance")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_and_retrieve_tenant() {
        let dir = tempfile::tempdir().unwrap();
        let store = TenantStore::new(dir.path()).unwrap();
        let admin = [1u8; 32];

        let id = store.create_tenant(admin, None).unwrap();
        let meta = store.get_tenant(&id).unwrap();

        assert_eq!(meta.state, TenantState::Active);
        assert_eq!(meta.admin_pubkey, admin);
        assert!(store.tenant_dir(&id).exists());
    }

    #[test]
    fn suspend_and_delete_tenant() {
        let dir = tempfile::tempdir().unwrap();
        let store = TenantStore::new(dir.path()).unwrap();
        let id = store.create_tenant([1u8; 32], None).unwrap();

        store.suspend_tenant(&id).unwrap();
        assert_eq!(store.get_tenant(&id).unwrap().state, TenantState::Suspended);

        store.delete_tenant(&id).unwrap();
        assert_eq!(store.get_tenant(&id).unwrap().state, TenantState::Deleted);
        assert!(!store.tenant_dir(&id).exists());
    }
}
