# Pulse Vault

## Purpose
Cryptographic primitives: signing, encryption, key exchange, password stretching.

## API
- `generatePulseKeyPair()` -- Ed25519 key pair
- `pulseSign(data, privateKey)` -- Ed25519 signature
- `pulseVerify(options)` -- verify signature
- `pulseEncrypt(options)` -- AES-GCM encryption
- `pulseDecrypt(options)` -- AES-GCM decryption
- `pulseSharedSecret(options)` -- X25519 ECDH shared secret
- `pulseStretchPassword(options)` -- scrypt key derivation

## Dependencies
- `@noble/curves` -- Ed25519, X25519
- `@noble/hashes` -- SHA-256, scrypt
- `@noble/ciphers` -- AES-GCM

## Status
Fully implemented. All algorithms operational.
