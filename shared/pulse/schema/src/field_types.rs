use serde::{Deserialize, Serialize};

use crate::engine_mapping::EngineMapping;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaDefinition {
    pub tenant_id: String,
    pub kind: u32,
    pub version: u32,
    pub fields: Vec<FieldDefinition>,
    pub engine_mappings: Vec<EngineMapping>,
    pub created_at: u64,
    pub created_by: [u8; 32],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub name: String,
    pub field_type: FieldType,
    pub required: bool,
    pub constraints: Vec<Constraint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FieldType {
    String,
    Number,
    Boolean,
    Bytes,
    Array(Box<FieldType>),
    Object,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Constraint {
    MinLength(usize),
    MaxLength(usize),
    Min(i64),
    Max(i64),
    Regex(String),
    Enum(Vec<String>),
}

impl FieldType {
    pub fn matches_json(&self, value: &serde_json::Value) -> bool {
        match (self, value) {
            (FieldType::String, serde_json::Value::String(_)) => true,
            (FieldType::Number, serde_json::Value::Number(_)) => true,
            (FieldType::Boolean, serde_json::Value::Bool(_)) => true,
            (FieldType::Bytes, serde_json::Value::String(_)) => true,
            (FieldType::Array(_), serde_json::Value::Array(_)) => true,
            (FieldType::Object, serde_json::Value::Object(_)) => true,
            _ => false,
        }
    }
}

impl Constraint {
    pub fn check(&self, value: &serde_json::Value) -> bool {
        match self {
            Constraint::MinLength(min) => match value {
                serde_json::Value::String(s) => s.len() >= *min,
                _ => true,
            },
            Constraint::MaxLength(max) => match value {
                serde_json::Value::String(s) => s.len() <= *max,
                _ => true,
            },
            Constraint::Min(min) => match value {
                serde_json::Value::Number(n) => {
                    n.as_i64().map(|v| v >= *min).unwrap_or(true)
                }
                _ => true,
            },
            Constraint::Max(max) => match value {
                serde_json::Value::Number(n) => {
                    n.as_i64().map(|v| v <= *max).unwrap_or(true)
                }
                _ => true,
            },
            Constraint::Regex(pattern) => match value {
                serde_json::Value::String(s) => {
                    // Simplified: just check contains for now
                    s.contains(pattern.as_str()) || pattern.is_empty()
                }
                _ => true,
            },
            Constraint::Enum(values) => match value {
                serde_json::Value::String(s) => values.contains(s),
                _ => true,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_type_matching() {
        assert!(FieldType::String.matches_json(&serde_json::json!("hello")));
        assert!(!FieldType::String.matches_json(&serde_json::json!(42)));
        assert!(FieldType::Number.matches_json(&serde_json::json!(42)));
        assert!(FieldType::Boolean.matches_json(&serde_json::json!(true)));
    }

    #[test]
    fn constraint_checks() {
        let min = Constraint::MinLength(3);
        assert!(min.check(&serde_json::json!("hello")));
        assert!(!min.check(&serde_json::json!("hi")));

        let max = Constraint::Max(100);
        assert!(max.check(&serde_json::json!(50)));
        assert!(!max.check(&serde_json::json!(200)));
    }
}
