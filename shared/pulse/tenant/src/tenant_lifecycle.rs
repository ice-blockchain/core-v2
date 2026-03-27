use serde::{Deserialize, Serialize};

use crate::tenant_quota::TenantQuota;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TenantState {
    Active,
    Suspended,
    Deleting,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantMetadata {
    pub tenant_id: String,
    pub state: TenantState,
    pub admin_pubkey: [u8; 32],
    pub quota: TenantQuota,
    pub created_at: u64,
    pub updated_at: u64,
}

impl TenantMetadata {
    pub fn is_writable(&self) -> bool {
        self.state == TenantState::Active
    }

    pub fn is_readable(&self) -> bool {
        matches!(self.state, TenantState::Active | TenantState::Suspended)
    }
}
