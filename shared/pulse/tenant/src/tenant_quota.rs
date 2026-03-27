use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantQuota {
    pub max_storage_bytes: u64,
    pub max_events_per_second: u32,
    pub max_queries_per_second: u32,
    pub max_connections: u32,
    pub max_vector_count: u64,
    pub sql_query_timeout_ms: u64,
}

impl Default for TenantQuota {
    fn default() -> Self {
        Self {
            max_storage_bytes: 1_073_741_824, // 1 GB
            max_events_per_second: 1_000,
            max_queries_per_second: 100,
            max_connections: 50,
            max_vector_count: 100_000,
            sql_query_timeout_ms: 30_000,
        }
    }
}

impl TenantQuota {
    pub fn check_storage(&self, current_bytes: u64) -> bool {
        current_bytes < self.max_storage_bytes
    }

    pub fn check_vectors(&self, current_count: u64) -> bool {
        current_count < self.max_vector_count
    }

    pub fn check_connections(&self, current: u32) -> bool {
        current < self.max_connections
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quota_defaults() {
        let q = TenantQuota::default();
        assert_eq!(q.max_storage_bytes, 1_073_741_824);
        assert!(q.check_storage(500_000_000));
        assert!(!q.check_storage(2_000_000_000));
    }
}
