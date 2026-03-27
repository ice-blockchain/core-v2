# pulse-schema

Unified schema registry with per-kind definitions, field types, constraints, engine mappings, and append-only versioning. Hard-rejects events that don't conform.

## Crate

`pulse-schema` -- `shared/pulse/schema/`

## Dependencies

- `heed` (LMDB, for persistent storage in production)
- `pulse-types`

## API

```rust
pub struct SchemaRegistry { .. }
impl SchemaRegistry {
    pub fn register(&self, schema: SchemaDefinition, admin_pubkey: &[u8; 32]) -> Result<u32, SchemaRegistryError>;
    pub fn get_latest(&self, tenant_id: &str, kind: u32) -> Result<SchemaDefinition, SchemaRegistryError>;
    pub fn get_version(&self, tenant_id: &str, kind: u32, version: u32) -> Result<SchemaDefinition, SchemaRegistryError>;
}

pub struct SchemaValidator;
impl SchemaValidator {
    pub fn validate(schema: &SchemaDefinition, content: &[u8]) -> Result<(), ValidationError>;
}

pub struct SchemaDefinition {
    pub tenant_id: String,
    pub kind: u32,
    pub version: u32,
    pub fields: Vec<FieldDefinition>,
    pub engine_mappings: Vec<EngineMapping>,
    pub created_at: u64,
    pub created_by: [u8; 32],
}
```

## Field Types

`String`, `Number`, `Boolean`, `Bytes`, `Array(T)`, `Object`

## Constraints

`MinLength`, `MaxLength`, `Min`, `Max`, `Regex`, `Enum`

## Engine Mappings

Each schema declares which storage engine handles events of that kind: `Graph`, `Kv`, `Vector`, `Analytics`, `Sql`.

## Versioning

- Schemas are immutable once registered (append-only)
- Version auto-increments: v1, v2, v3...
- Old events retain their schema version
- New events must match latest version or be rejected
- Only tenant admin pubkey can register schemas

## Files

| File | Purpose |
|------|---------|
| `src/field_types.rs` | SchemaDefinition, FieldDefinition, FieldType, Constraint |
| `src/engine_mapping.rs` | EngineMapping, EngineTarget |
| `src/schema_registry.rs` | SchemaRegistry (in-memory with history) |
| `src/schema_validator.rs` | SchemaValidator (field check + constraint check) |
