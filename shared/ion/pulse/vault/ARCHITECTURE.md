# Pulse Vault

Cryptography primitives for identity, encryption, and namespace access control.

## API

| Export | Type | Description |
|---|---|---|
| `generatePulseKeyPair` | function | Generates an Ed25519 signing key pair |
| `pulseSign` | function | Signs a message with an Ed25519 private key |
| `pulseVerify` | function | Verifies an Ed25519 signature |
| `pulseEncrypt` | function | Encrypts data with AES-256-GCM |
| `pulseDecrypt` | function | Decrypts AES-256-GCM ciphertext |
| `pulseSharedSecret` | function | Derives a shared secret via X25519 ECDH |
| `pulseStretchPassword` | function | Derives a key from a password using scrypt |
| `createPulseNamespace` | function | Creates a write-protected namespace bound to a public key |
| `verifyNamespaceAccess` | function | Checks if a key pair has write access to a namespace |
| `PulseKeyPair` | type | Ed25519 key pair (publicKey, privateKey as Uint8Array) |

## Dependencies

- `@noble/curves` -- Ed25519 signing and X25519 ECDH key agreement
- `@noble/hashes` -- SHA-256, scrypt for password stretching
- `@noble/ciphers` -- AES-256-GCM authenticated encryption

## Design Decisions

- Zero native dependencies -- all crypto uses pure JS `@noble/*` libraries; no OpenSSL or platform bindings required
- Ed25519 to X25519 conversion -- signing keys are converted to X25519 for ECDH, so a single key pair handles both signing and encryption
- User namespaces with write protection -- graph paths are bound to public keys; only the holder of the corresponding private key can write to their namespace
- Deterministic key derivation -- `pulseStretchPassword` uses scrypt with fixed parameters so the same password always produces the same key pair across devices
