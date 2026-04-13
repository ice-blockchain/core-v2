use std::collections::HashMap;
use std::sync::RwLock;
use thiserror::Error;

use crate::field_types::SchemaDefinition;

#[derive(Debug, Error)]
pub enum SchemaRegistryError {
    #[error("schema not found for tenant={0} kind={1}")]
    NotFound(String, u32),
    #[error("version conflict: expected {expected}, got {actual}")]
    VersionConflict { expected: u32, actual: u32 },
    #[error("unauthorized: only tenant admin can register schemas")]
    Unauthorized,
    #[error("lock poisoned")]
    LockPoisoned,
}

type SchemaKey = (String, u32); // (tenant_id, kind)

/// In-memory schema registry with append-only versioning.
/// Production deployment would persist to LMDB.
pub struct SchemaRegistry {
    latest: RwLock<HashMap<SchemaKey, SchemaDefinition>>,
    history: RwLock<HashMap<(String, u32, u32), SchemaDefinition>>,
}

impl SchemaRegistry {
    pub fn new() -> Self {
        Self {
            latest: RwLock::new(HashMap::new()),
            history: RwLock::new(HashMap::new()),
        }
    }

    pub fn register(
        &self,
        schema: SchemaDefinition,
        admin_pubkey: &[u8; 32],
    ) -> Result<u32, SchemaRegistryError> {
        if schema.created_by != *admin_pubkey {
            return Err(SchemaRegistryError::Unauthorized);
        }

        let key = (schema.tenant_id.clone(), schema.kind);
        let mut latest = self
            .latest
            .write()
            .map_err(|_| SchemaRegistryError::LockPoisoned)?;

        let expected_version = latest
            .get(&key)
            .map(|s| s.version + 1)
            .unwrap_or(1);

        if schema.version != expected_version {
            return Err(SchemaRegistryError::VersionConflict {
                expected: expected_version,
                actual: schema.version,
            });
        }

        let version = schema.version;
        let history_key = (schema.tenant_id.clone(), schema.kind, version);

        self.history
            .write()
            .map_err(|_| SchemaRegistryError::LockPoisoned)?
            .insert(history_key, schema.clone());

        latest.insert(key, schema);

        Ok(version)
    }

    pub fn get_latest(
        &self,
        tenant_id: &str,
        kind: u32,
    ) -> Result<SchemaDefinition, SchemaRegistryError> {
        let latest = self
            .latest
            .read()
            .map_err(|_| SchemaRegistryError::LockPoisoned)?;

        latest
            .get(&(tenant_id.to_string(), kind))
            .cloned()
            .ok_or_else(|| SchemaRegistryError::NotFound(tenant_id.to_string(), kind))
    }

    pub fn get_version(
        &self,
        tenant_id: &str,
        kind: u32,
        version: u32,
    ) -> Result<SchemaDefinition, SchemaRegistryError> {
        let history = self
            .history
            .read()
            .map_err(|_| SchemaRegistryError::LockPoisoned)?;

        history
            .get(&(tenant_id.to_string(), kind, version))
            .cloned()
            .ok_or_else(|| SchemaRegistryError::NotFound(tenant_id.to_string(), kind))
    }
}

impl Default for SchemaRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::field_types::*;

    fn make_schema(tenant: &str, kind: u32, version: u32, admin: [u8; 32]) -> SchemaDefinition {
        SchemaDefinition {
            tenant_id: tenant.to_string(),
            kind,
            version,
            fields: vec![FieldDefinition {
                name: "title".to_string(),
                field_type: FieldType::String,
                required: true,
                constraints: vec![Constraint::MaxLength(256)],
            }],
            engine_mappings: vec![],
            created_at: 1000,
            created_by: admin,
        }
    }

    #[test]
    fn register_and_retrieve() {
        let registry = SchemaRegistry::new();
        let admin = [1u8; 32];
        let schema = make_schema("t1", 1, 1, admin);
        let v = registry.register(schema, &admin).unwrap();
        assert_eq!(v, 1);

        let retrieved = registry.get_latest("t1", 1).unwrap();
        assert_eq!(retrieved.version, 1);
    }

    #[test]
    fn version_conflict() {
        let registry = SchemaRegistry::new();
        let admin = [1u8; 32];
        registry
            .register(make_schema("t1", 1, 1, admin), &admin)
            .unwrap();

        let result = registry.register(make_schema("t1", 1, 5, admin), &admin);
        assert!(result.is_err());
    }

    #[test]
    fn unauthorized_registration() {
        let registry = SchemaRegistry::new();
        let admin = [1u8; 32];
        let impostor = [2u8; 32];
        let schema = make_schema("t1", 1, 1, admin);
        let result = registry.register(schema, &impostor);
        assert!(result.is_err());
    }
}
