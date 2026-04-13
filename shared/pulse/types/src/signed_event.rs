use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignedEvent {
    pub id: [u8; 32],
    pub pubkey: [u8; 32],
    pub created_at: u64,
    pub kind: u32,
    pub tags: Vec<Vec<String>>,
    #[serde(with = "content_serde")]
    pub content: Vec<u8>,
    pub sig: [u8; 64],
}

impl SignedEvent {
    pub fn compute_id(
        pubkey: &[u8; 32],
        created_at: u64,
        kind: u32,
        tags: &[Vec<String>],
        content: &[u8],
    ) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(pubkey);
        hasher.update(created_at.to_be_bytes());
        hasher.update(kind.to_be_bytes());

        let tags_json = serde_json::to_vec(tags).unwrap_or_default();
        hasher.update(&tags_json);
        hasher.update(content);

        let result = hasher.finalize();
        let mut id = [0u8; 32];
        id.copy_from_slice(&result);
        id
    }

    pub fn verify_id(&self) -> bool {
        let computed = Self::compute_id(
            &self.pubkey,
            self.created_at,
            self.kind,
            &self.tags,
            &self.content,
        );
        computed == self.id
    }

    pub fn id_hex(&self) -> String {
        hex::encode(self.id)
    }

    pub fn pubkey_hex(&self) -> String {
        hex::encode(self.pubkey)
    }
}

mod content_serde {
    use serde::{self, Deserializer, Serializer, Deserialize};
    use base64::engine::{general_purpose::STANDARD, Engine};

    pub fn serialize<S>(data: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&STANDARD.encode(data))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        STANDARD.decode(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_id_is_deterministic() {
        let pubkey = [1u8; 32];
        let id1 = SignedEvent::compute_id(&pubkey, 1000, 1, &[], b"hello");
        let id2 = SignedEvent::compute_id(&pubkey, 1000, 1, &[], b"hello");
        assert_eq!(id1, id2);
    }

    #[test]
    fn different_content_produces_different_id() {
        let pubkey = [1u8; 32];
        let id1 = SignedEvent::compute_id(&pubkey, 1000, 1, &[], b"hello");
        let id2 = SignedEvent::compute_id(&pubkey, 1000, 1, &[], b"world");
        assert_ne!(id1, id2);
    }
}
