# Pulse Vault

Cryptographic operations using the @noble suite. Signing, encryption, key exchange.

## Dependencies
- `@noble/curves` -- Ed25519 signing, X25519 ECDH
- `@noble/hashes` -- SHA-256, scrypt, PBKDF2
- `@noble/ciphers` -- AES-GCM encryption

## API Surface
- `generatePulseKeyPair()` -- Ed25519 key pair
- `pulseSign(data, privateKey)` / `pulseVerify(data, signature, publicKey)`
- `pulseEncrypt(data, key)` / `pulseDecrypt(data, key)` -- AES-GCM
- `pulseSharedSecret(theirPublicKey, myPrivateKey)` -- X25519 ECDH
- `pulseStretchPassword(password, salt)` -- scrypt

## Design Decisions
- Ed25519 over P-256: faster, smaller keys, more widely adopted in decentralized systems
- @noble suite: 6 independent audits, zero native deps, works everywhere
- User namespaces: `~<pubkey>/path` with write protection verified against signing key
