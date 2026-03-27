use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EdgeDirection {
    Outgoing,
    Incoming,
}

/// Composite key for edge lookups.
/// Serialized as `from_pubkey || edge_kind(u32 BE) || to_pubkey`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EdgeKey {
    pub from: [u8; 32],
    pub edge_kind: u32,
    pub to: [u8; 32],
}

impl EdgeKey {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(68);
        buf.extend_from_slice(&self.from);
        buf.extend_from_slice(&self.edge_kind.to_be_bytes());
        buf.extend_from_slice(&self.to);
        buf
    }

    pub fn from_bytes(data: &[u8]) -> Option<Self> {
        if data.len() < 68 {
            return None;
        }
        let mut from = [0u8; 32];
        from.copy_from_slice(&data[0..32]);
        let edge_kind = u32::from_be_bytes([data[32], data[33], data[34], data[35]]);
        let mut to = [0u8; 32];
        to.copy_from_slice(&data[36..68]);
        Some(Self { from, edge_kind, to })
    }

    pub fn outgoing_prefix(pubkey: &[u8; 32], edge_kind: u32) -> Vec<u8> {
        let mut buf = Vec::with_capacity(36);
        buf.extend_from_slice(pubkey);
        buf.extend_from_slice(&edge_kind.to_be_bytes());
        buf
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edge_key_roundtrip() {
        let key = EdgeKey {
            from: [1u8; 32],
            edge_kind: 4,
            to: [2u8; 32],
        };
        let bytes = key.to_bytes();
        let decoded = EdgeKey::from_bytes(&bytes).unwrap();
        assert_eq!(key, decoded);
    }
}
