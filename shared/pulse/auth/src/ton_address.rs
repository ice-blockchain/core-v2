use sha2::{Digest, Sha256};
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};

const WORKCHAIN_ID: i8 = 0;

/// Derive a TON address from an Ed25519 public key.
/// Uses workchain 0 and a simplified wallet code hash
/// to produce a base64url-encoded address.
pub fn derive_ton_address(pubkey: &[u8; 32]) -> String {
    let mut hasher = Sha256::new();

    // Simplified TON address derivation:
    // hash(workchain_id || wallet_state_init(pubkey))
    hasher.update([WORKCHAIN_ID as u8]);
    hasher.update(pubkey);

    let hash = hasher.finalize();
    let mut address_bytes = Vec::with_capacity(34);
    address_bytes.push(0x11); // bounceable flag
    address_bytes.push(WORKCHAIN_ID as u8);
    address_bytes.extend_from_slice(&hash);

    let crc = crc16_xmodem(&address_bytes);
    address_bytes.push((crc >> 8) as u8);
    address_bytes.push((crc & 0xff) as u8);

    URL_SAFE_NO_PAD.encode(&address_bytes)
}

fn crc16_xmodem(data: &[u8]) -> u16 {
    let mut crc: u16 = 0;
    for &byte in data {
        crc ^= (byte as u16) << 8;
        for _ in 0..8 {
            if crc & 0x8000 != 0 {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derive_address_is_deterministic() {
        let pubkey = [42u8; 32];
        let addr1 = derive_ton_address(&pubkey);
        let addr2 = derive_ton_address(&pubkey);
        assert_eq!(addr1, addr2);
        assert!(!addr1.is_empty());
    }

    #[test]
    fn different_keys_produce_different_addresses() {
        let addr1 = derive_ton_address(&[1u8; 32]);
        let addr2 = derive_ton_address(&[2u8; 32]);
        assert_ne!(addr1, addr2);
    }

    #[test]
    fn address_is_base64url_encoded() {
        let addr = derive_ton_address(&[0u8; 32]);
        assert!(addr.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'));
    }
}
