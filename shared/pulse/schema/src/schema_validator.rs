use thiserror::Error;

use crate::field_types::SchemaDefinition;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("required field missing: {0}")]
    RequiredFieldMissing(String),
    #[error("field type mismatch: {field} expected {expected:?}")]
    TypeMismatch {
        field: String,
        expected: String,
    },
    #[error("constraint failed on field {field}: {constraint}")]
    ConstraintFailed {
        field: String,
        constraint: String,
    },
    #[error("content is not valid JSON")]
    InvalidJson,
}

/// Validates event content against a schema definition.
/// Hard-rejects events that don't conform.
pub struct SchemaValidator;

impl SchemaValidator {
    pub fn validate(
        schema: &SchemaDefinition,
        content: &[u8],
    ) -> Result<(), ValidationError> {
        let value: serde_json::Value =
            serde_json::from_slice(content).map_err(|_| ValidationError::InvalidJson)?;

        let obj = match &value {
            serde_json::Value::Object(m) => m,
            _ => return Err(ValidationError::InvalidJson),
        };

        for field in &schema.fields {
            match obj.get(&field.name) {
                None if field.required => {
                    return Err(ValidationError::RequiredFieldMissing(
                        field.name.clone(),
                    ));
                }
                None => continue,
                Some(val) => {
                    if !field.field_type.matches_json(val) {
                        return Err(ValidationError::TypeMismatch {
                            field: field.name.clone(),
                            expected: format!("{:?}", field.field_type),
                        });
                    }
                    for constraint in &field.constraints {
                        if !constraint.check(val) {
                            return Err(ValidationError::ConstraintFailed {
                                field: field.name.clone(),
                                constraint: format!("{:?}", constraint),
                            });
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::field_types::*;

    fn make_schema() -> SchemaDefinition {
        SchemaDefinition {
            tenant_id: "t1".to_string(),
            kind: 1,
            version: 1,
            fields: vec![
                FieldDefinition {
                    name: "title".to_string(),
                    field_type: FieldType::String,
                    required: true,
                    constraints: vec![Constraint::MaxLength(100)],
                },
                FieldDefinition {
                    name: "score".to_string(),
                    field_type: FieldType::Number,
                    required: false,
                    constraints: vec![Constraint::Min(0), Constraint::Max(100)],
                },
            ],
            engine_mappings: vec![],
            created_at: 1000,
            created_by: [0u8; 32],
        }
    }

    #[test]
    fn valid_content_passes() {
        let schema = make_schema();
        let content = serde_json::json!({"title": "hello", "score": 42});
        let bytes = serde_json::to_vec(&content).unwrap();
        assert!(SchemaValidator::validate(&schema, &bytes).is_ok());
    }

    #[test]
    fn missing_required_field_fails() {
        let schema = make_schema();
        let content = serde_json::json!({"score": 42});
        let bytes = serde_json::to_vec(&content).unwrap();
        assert!(SchemaValidator::validate(&schema, &bytes).is_err());
    }

    #[test]
    fn type_mismatch_fails() {
        let schema = make_schema();
        let content = serde_json::json!({"title": 123});
        let bytes = serde_json::to_vec(&content).unwrap();
        assert!(SchemaValidator::validate(&schema, &bytes).is_err());
    }

    #[test]
    fn constraint_violation_fails() {
        let schema = make_schema();
        let content = serde_json::json!({"title": "hi", "score": 200});
        let bytes = serde_json::to_vec(&content).unwrap();
        assert!(SchemaValidator::validate(&schema, &bytes).is_err());
    }
}
