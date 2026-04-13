# pulse-tenant

Multi-tenant isolation with DB-as-a-Service model. Each tenant gets isolated storage directories, independent quotas, and lifecycle management.

## Crate

`pulse-tenant` -- `shared/pulse/tenant/`

## Dependencies

- `heed` (LMDB)
- `uuid` (tenant ID generation)
- `lru` (resolver cache)
- `pulse-types`

## API

```rust
pub struct TenantStore { .. }
impl TenantStore {
    pub fn new(data_dir: &Path) -> Result<Self, TenantStoreError>;
    pub fn create_tenant(&self, admin_pubkey: [u8; 32], quota: Option<TenantQuota>) -> Result<String, TenantStoreError>;
    pub fn get_tenant(&self, tenant_id: &str) -> Result<TenantMetadata, TenantStoreError>;
    pub fn suspend_tenant(&self, tenant_id: &str) -> Result<(), TenantStoreError>;
    pub fn delete_tenant(&self, tenant_id: &str) -> Result<(), TenantStoreError>;
}

pub struct TenantResolver { .. }
impl TenantResolver {
    pub fn new(store: Arc<TenantStore>, cache_size: usize) -> Self;
    pub async fn resolve(&self, tenant_id: &str) -> Result<TenantMetadata, TenantStoreError>;
    pub async fn invalidate(&self, tenant_id: &str);
}
```

## Tenant Lifecycle

| State | Description |
|-------|-------------|
| `Active` | Normal operation, all APIs available |
| `Suspended` | Read-only, writes rejected |
| `Deleting` | Async deletion in progress |
| `Deleted` | Tombstone, directories removed |

## Storage Layout

```
data/tenants/{tenant_id}/
  lmdb/        # Graph + KV data
  duckdb/      # Analytics data
  lance/       # Vector data
  meta.json    # Tenant metadata
```

## Default Quotas

| Quota | Default |
|-------|---------|
| `max_storage_bytes` | 1 GB |
| `max_events_per_second` | 1,000 |
| `max_queries_per_second` | 100 |
| `max_connections` | 50 |
| `max_vector_count` | 100,000 |
| `sql_query_timeout_ms` | 30,000 |

## Files

| File | Purpose |
|------|---------|
| `src/tenant_store.rs` | TenantStore, create/suspend/delete lifecycle |
| `src/tenant_lifecycle.rs` | TenantState, TenantMetadata |
| `src/tenant_quota.rs` | TenantQuota with defaults and checks |
| `src/tenant_resolver.rs` | TenantResolver with LRU cache |
