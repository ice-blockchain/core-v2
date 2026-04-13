use std::collections::HashMap;
use std::sync::RwLock;

/// Manages virtual table definitions per tenant for the SQL API.
/// Maps tenant table names to their column definitions
/// so DataFusion can create TableProviders that read from LMDB.
pub struct SqlSchemaManager {
    tables: RwLock<HashMap<(String, String), TableDefinition>>,
}

#[derive(Debug, Clone)]
pub struct TableDefinition {
    pub tenant_id: String,
    pub table_name: String,
    pub columns: Vec<ColumnDefinition>,
}

#[derive(Debug, Clone)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: SqlDataType,
    pub nullable: bool,
}

#[derive(Debug, Clone)]
pub enum SqlDataType {
    Utf8,
    Int64,
    Float64,
    Boolean,
    Binary,
    Timestamp,
}

impl SqlSchemaManager {
    pub fn new() -> Self {
        Self {
            tables: RwLock::new(HashMap::new()),
        }
    }

    pub fn register_table(&self, definition: TableDefinition) {
        let key = (
            definition.tenant_id.clone(),
            definition.table_name.clone(),
        );
        self.tables.write().unwrap().insert(key, definition);
    }

    pub fn get_table(
        &self,
        tenant_id: &str,
        table_name: &str,
    ) -> Option<TableDefinition> {
        self.tables
            .read()
            .unwrap()
            .get(&(tenant_id.to_string(), table_name.to_string()))
            .cloned()
    }

    pub fn drop_table(&self, tenant_id: &str, table_name: &str) -> bool {
        self.tables
            .write()
            .unwrap()
            .remove(&(tenant_id.to_string(), table_name.to_string()))
            .is_some()
    }

    pub fn list_tables(&self, tenant_id: &str) -> Vec<String> {
        self.tables
            .read()
            .unwrap()
            .keys()
            .filter(|(tid, _)| tid == tenant_id)
            .map(|(_, name)| name.clone())
            .collect()
    }
}

impl Default for SqlSchemaManager {
    fn default() -> Self {
        Self::new()
    }
}
