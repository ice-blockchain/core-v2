# pulse-auth

Ed25519 signature verification, SHA-256 event ID computation, TON address derivation, and per-tenant rate limiting.

## Crate

`pulse-auth` -- `shared/pulse/auth/`

## Dependencies

- `sodiumoxide` (libsodium C FFI) -- Ed25519 verify, SHA-256
- `sha2` -- SHA-256 for event ID computation
- `base64` -- TON address encoding
- `governor` -- Token-bucket rate limiting
- `pulse-types` -- SignedEvent struct

## API

```rust
// Verify full event (id hash + Ed25519 signature)
pub fn verify_event(event: &SignedEvent) -> Result<(), PulseError>;

// Verify raw Ed25519 signature
pub fn verify_signature(message: &[u8; 32], sig: &[u8; 64], pubkey: &[u8; 32]) -> Result<(), PulseError>;

// Derive TON address from Ed25519 public key
pub fn derive_ton_address(pubkey: &[u8; 32]) -> String;

// Per-tenant rate limiter (token bucket via governor)
pub struct RateLimiter { .. }
impl RateLimiter {
    pub fn new(writes_per_second: u32, reads_per_second: u32) -> Self;
    pub fn check_write(&self) -> bool;
    pub fn check_read(&self) -> bool;
}
```

## Verification Flow

1. Compute `SHA-256(pubkey || created_at || kind || tags || content)` -> expected ID
2. Compare expected ID with `event.id` -> reject if mismatch
3. `crypto_sign_ed25519_verify_detached(sig, id, pubkey)` -> reject if invalid

## Performance

- Ed25519 verify: ~20us per event (libsodium)
- SHA-256 hash: ~0.5us
- 50K verifications/second single-threaded

## Files

| File | Purpose |
|------|---------|
| `src/event_verify.rs` | `verify_event()`, `verify_signature()` |
| `src/ton_address.rs` | `derive_ton_address()` with CRC-16 XMODEM |
| `src/rate_limiter.rs` | `RateLimiter` with token-bucket write/read limits |
