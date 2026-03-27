use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EngineTarget {
    Graph,
    Kv,
    Vector,
    Analytics,
    Sql,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineMapping {
    pub engine: EngineTarget,
    pub config: serde_json::Value,
}

impl EngineMapping {
    pub fn graph(config: serde_json::Value) -> Self {
        Self {
            engine: EngineTarget::Graph,
            config,
        }
    }

    pub fn kv(config: serde_json::Value) -> Self {
        Self {
            engine: EngineTarget::Kv,
            config,
        }
    }

    pub fn vector(config: serde_json::Value) -> Self {
        Self {
            engine: EngineTarget::Vector,
            config,
        }
    }

    pub fn analytics(config: serde_json::Value) -> Self {
        Self {
            engine: EngineTarget::Analytics,
            config,
        }
    }
}
