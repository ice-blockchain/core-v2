use pulse_types::{PulseError, SignedEvent};
use sodiumoxide::crypto::sign;

/// Verify the Ed25519 signature on a signed event.
/// Checks both that the event ID matches the payload hash
/// and that the signature is valid for the claimed pubkey.
pub fn verify_event(event: &SignedEvent) -> Result<(), PulseError> {
    if !event.verify_id() {
        return Err(PulseError::InvalidEventId);
    }
    verify_signature(&event.id, &event.sig, &event.pubkey)
}

pub fn verify_signature(
    message: &[u8; 32],
    sig_bytes: &[u8; 64],
    pubkey_bytes: &[u8; 32],
) -> Result<(), PulseError> {
    let pubkey =
        sign::ed25519::PublicKey::from_slice(pubkey_bytes).ok_or(PulseError::InvalidSignature)?;
    let sig =
        sign::ed25519::Signature::from_bytes(sig_bytes).map_err(|_| PulseError::InvalidSignature)?;

    if sign::ed25519::verify_detached(&sig, message, &pubkey) {
        Ok(())
    } else {
        Err(PulseError::InvalidSignature)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sodiumoxide::crypto::sign;

    fn make_signed_event() -> SignedEvent {
        sodiumoxide::init().expect("sodiumoxide init");
        let (pk, sk) = sign::ed25519::gen_keypair();
        let pubkey: [u8; 32] = pk.0;
        let created_at = 1700000000u64;
        let kind = 1u32;
        let tags: Vec<Vec<String>> = vec![];
        let content = b"hello world".to_vec();

        let id = SignedEvent::compute_id(&pubkey, created_at, kind, &tags, &content);
        let sig_obj = sign::ed25519::sign_detached(&id, &sk);
        let mut sig = [0u8; 64];
        sig.copy_from_slice(&sig_obj.0);

        SignedEvent {
            id,
            pubkey,
            created_at,
            kind,
            tags,
            content,
            sig,
        }
    }

    #[test]
    fn valid_event_passes_verification() {
        let event = make_signed_event();
        assert!(verify_event(&event).is_ok());
    }

    #[test]
    fn tampered_content_fails_verification() {
        let mut event = make_signed_event();
        event.content = b"tampered".to_vec();
        assert!(verify_event(&event).is_err());
    }

    #[test]
    fn wrong_pubkey_fails_verification() {
        let mut event = make_signed_event();
        event.pubkey = [0xffu8; 32];
        assert!(verify_event(&event).is_err());
    }
}
