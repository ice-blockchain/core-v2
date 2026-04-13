use std::path::Path;
use std::sync::Arc;

use heed::types::Bytes;
use heed::{Database, Env, EnvOpenOptions};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum KvStoreError {
    #[error("heed error: {0}")]
    Heed(#[from] heed::Error),
    #[error("key not found")]
    NotFound,
    #[error("serialization error: {0}")]
    Serialization(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KvEntry {
    pub value: Vec<u8>,
    pub sig: [u8; 64],
    pub created_at: u64,
    pub updated_at: u64,
}

/// LMDB-backed key-value store. Shares the same LMDB environment
/// as pulse-graph when running inside a tenant, but uses separate
/// named databases: `user_kv` and `kv_meta`.
pub struct KvStore {
    env: Arc<Env>,
    user_kv_db: Database<Bytes, Bytes>,
    kv_meta_db: Database<Bytes, Bytes>,
}

impl KvStore {
    pub fn open(path: &Path, map_size: usize) -> Result<Self, KvStoreError> {
        std::fs::create_dir_all(path)
            .map_err(|e| KvStoreError::Heed(heed::Error::Io(e)))?;

        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(map_size)
                .max_dbs(2)
                .open(path)?
        };
        let env = Arc::new(env);

        let mut wtxn = env.write_txn()?;
        let user_kv_db = env.create_database(&mut wtxn, Some("user_kv"))?;
        let kv_meta_db = env.create_database(&mut wtxn, Some("kv_meta"))?;
        wtxn.commit()?;

        Ok(Self {
            env,
            user_kv_db,
            kv_meta_db,
        })
    }

    pub fn open_with_env(env: Arc<Env>) -> Result<Self, KvStoreError> {
        let mut wtxn = env.write_txn()?;
        let user_kv_db = env.create_database(&mut wtxn, Some("user_kv"))?;
        let kv_meta_db = env.create_database(&mut wtxn, Some("kv_meta"))?;
        wtxn.commit()?;

        Ok(Self {
            env,
            user_kv_db,
            kv_meta_db,
        })
    }

    fn build_key(pubkey: &[u8; 32], key_name: &str) -> Vec<u8> {
        let mut k = Vec::with_capacity(32 + key_name.len());
        k.extend_from_slice(pubkey);
        k.extend_from_slice(key_name.as_bytes());
        k
    }

    pub fn put(
        &self,
        pubkey: &[u8; 32],
        key_name: &str,
        value: &[u8],
        sig: &[u8; 64],
        now: u64,
    ) -> Result<(), KvStoreError> {
        let db_key = Self::build_key(pubkey, key_name);
        let mut wtxn = self.env.write_txn()?;

        let created_at = match self.kv_meta_db.get(&wtxn, &db_key)? {
            Some(meta_bytes) if meta_bytes.len() >= 8 => {
                u64::from_be_bytes(meta_bytes[0..8].try_into().unwrap())
            }
            _ => now,
        };

        let entry = KvEntry {
            value: value.to_vec(),
            sig: *sig,
            created_at,
            updated_at: now,
        };
        let entry_bytes = serde_json::to_vec(&entry)
            .map_err(|e| KvStoreError::Serialization(e.to_string()))?;
        self.user_kv_db.put(&mut wtxn, &db_key, &entry_bytes)?;

        let mut meta = Vec::with_capacity(16);
        meta.extend_from_slice(&created_at.to_be_bytes());
        meta.extend_from_slice(&now.to_be_bytes());
        self.kv_meta_db.put(&mut wtxn, &db_key, &meta)?;

        wtxn.commit()?;
        Ok(())
    }

    pub fn get(
        &self,
        pubkey: &[u8; 32],
        key_name: &str,
    ) -> Result<Option<KvEntry>, KvStoreError> {
        let db_key = Self::build_key(pubkey, key_name);
        let rtxn = self.env.read_txn()?;
        match self.user_kv_db.get(&rtxn, &db_key)? {
            Some(bytes) => {
                let entry: KvEntry = serde_json::from_slice(bytes)
                    .map_err(|e| KvStoreError::Serialization(e.to_string()))?;
                Ok(Some(entry))
            }
            None => Ok(None),
        }
    }

    pub fn delete(
        &self,
        pubkey: &[u8; 32],
        key_name: &str,
    ) -> Result<bool, KvStoreError> {
        let db_key = Self::build_key(pubkey, key_name);
        let mut wtxn = self.env.write_txn()?;
        let existed = self.user_kv_db.delete(&mut wtxn, &db_key)?;
        self.kv_meta_db.delete(&mut wtxn, &db_key)?;
        wtxn.commit()?;
        Ok(existed)
    }

    pub fn env(&self) -> &Env {
        &self.env
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn put_get_delete() {
        let dir = tempfile::tempdir().unwrap();
        let store = KvStore::open(dir.path(), 10 * 1024 * 1024).unwrap();
        let pubkey = [1u8; 32];
        let sig = [0u8; 64];

        store
            .put(&pubkey, "theme", b"dark", &sig, 1000)
            .unwrap();

        let entry = store.get(&pubkey, "theme").unwrap().unwrap();
        assert_eq!(entry.value, b"dark");
        assert_eq!(entry.created_at, 1000);

        store
            .put(&pubkey, "theme", b"light", &sig, 2000)
            .unwrap();
        let entry = store.get(&pubkey, "theme").unwrap().unwrap();
        assert_eq!(entry.value, b"light");
        assert_eq!(entry.created_at, 1000);
        assert_eq!(entry.updated_at, 2000);

        assert!(store.delete(&pubkey, "theme").unwrap());
        assert!(store.get(&pubkey, "theme").unwrap().is_none());
    }
}
