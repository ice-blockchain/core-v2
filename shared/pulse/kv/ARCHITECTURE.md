# pulse-kv

Fast LMDB-backed key-value store. Shares the same LMDB environment as pulse-graph when running inside a tenant.

## Crate

`pulse-kv` -- `shared/pulse/kv/`

## Dependencies

- `heed` 0.20+ (LMDB bindings)
- `pulse-types` (SignedEvent)

## LMDB Database Layout

| Database | Key | Value | Purpose |
|----------|-----|-------|---------|
| `user_kv` | `pubkey(32) + key_name` | `KvEntry (value + sig + timestamps)` | User settings, preferences |
| `kv_meta` | `pubkey(32) + key_name` | `created_at(u64) + updated_at(u64)` | Cache invalidation metadata |

## API

```rust
pub struct KvStore { .. }
impl KvStore {
    pub fn open(path: &Path, map_size: usize) -> Result<Self, KvStoreError>;
    pub fn open_with_env(env: Arc<Env>) -> Result<Self, KvStoreError>;
    pub fn put(&self, pubkey: &[u8; 32], key_name: &str, value: &[u8], sig: &[u8; 64], now: u64) -> Result<(), KvStoreError>;
    pub fn get(&self, pubkey: &[u8; 32], key_name: &str) -> Result<Option<KvEntry>, KvStoreError>;
    pub fn delete(&self, pubkey: &[u8; 32], key_name: &str) -> Result<bool, KvStoreError>;
}
```

## Files

| File | Purpose |
|------|---------|
| `src/kv_store.rs` | KvStore, KvEntry, all CRUD operations |
