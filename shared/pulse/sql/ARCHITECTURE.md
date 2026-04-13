# pulse-sql

Multi-threaded tenant-scoped SQL query API powered by Apache DataFusion. Reads from LMDB via custom TableProvider. Returns Arrow IPC batches.

## Crate

`pulse-sql` -- `shared/pulse/sql/`

## Dependencies

- `datafusion` 43 (Apache Arrow SQL engine)
- `heed` (LMDB, shared with Graph/KV)
- `pulse-types`, `pulse-graph`

## API

```rust
pub struct SqlExecutor { .. }
impl SqlExecutor {
    pub fn new(config: SqlConfig) -> Self;
    pub async fn execute_query(&self, sql: &str, tenant_id: &str) -> Result<Vec<ResultBatch>, SqlExecutorError>;
    pub async fn execute_ddl(&self, sql: &str, tenant_id: &str, admin_pubkey: &[u8; 32]) -> Result<(), SqlExecutorError>;
}

pub struct SqlSchemaManager { .. }
impl SqlSchemaManager {
    pub fn register_table(&self, definition: TableDefinition);
    pub fn get_table(&self, tenant_id: &str, table_name: &str) -> Option<TableDefinition>;
    pub fn drop_table(&self, tenant_id: &str, table_name: &str) -> bool;
    pub fn list_tables(&self, tenant_id: &str) -> Vec<String>;
}
```

## Security Constraints

- kind=4000: SELECT only (no INSERT/UPDATE/DELETE via SQL)
- kind=4001-4003: DDL requires tenant admin signature
- Per-tenant query timeout (default 30s)
- Tenant isolation via schema-registered TableProviders

## Config Defaults

| Setting | Default |
|---------|---------|
| `query_timeout_ms` | 30,000 |
| `max_rows_per_batch` | 10,000 |

## Files

| File | Purpose |
|------|---------|
| `src/sql_executor.rs` | SqlExecutor, query/DDL execution with timeout |
| `src/schema_manager.rs` | SqlSchemaManager, table definitions |
| `src/result_stream.rs` | ResultBatch type for Arrow IPC output |
