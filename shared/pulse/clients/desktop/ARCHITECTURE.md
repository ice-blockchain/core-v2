# Pulse Desktop Client

## Stack

| Concern | Crate | Notes |
|---------|-------|-------|
| Transport | `wtransport` (client mode) | Same crate as server, client API |
| Crypto (Ed25519) | `sodiumoxide` | Same as server -- shared code |
| Local storage | `heed` (LMDB) | Same as server -- shared code |
| UI | `tauri` or `egui` | Desktop app framework |

## Advantage: Maximum Code Reuse

The desktop client shares Rust crates with the relay server:

| Shared Crate | Desktop Use |
|-------------|-------------|
| `pulse-types` | SignedEvent construction, kind routing |
| `pulse-auth` | Event signing and verification |
| `pulse-kv` | Local key-value cache (offline storage) |
| `pulse-graph` | Local graph cache for followed users |
| `pulse-signal` | Client-side subscription management |

## Architecture

```
┌─────────────────────────────────────────┐
│               Desktop App               │
│  ┌────────────┐  ┌───────────────────┐  │
│  │  UI Layer  │  │  Subscription Mgr │  │
│  │ (tauri/egui)│  │  (pulse-signal)   │  │
│  └─────┬──────┘  └────────┬──────────┘  │
│        │                  │             │
│  ┌─────┴──────────────────┴──────────┐  │
│  │         Client Controller         │  │
│  └─────┬──────────────────┬──────────┘  │
│        │                  │             │
│  ┌─────┴──────┐  ┌───────┴──────────┐  │
│  │  Transport │  │  Local Storage   │  │
│  │ (wtransport)│  │ (pulse-kv/graph) │  │
│  └─────┬──────┘  └──────────────────┘  │
│        │                               │
└────────┼───────────────────────────────┘
         │
    QUIC/WebTransport
         │
    ┌────┴────┐
    │  Relay  │
    └─────────┘
```

## Cargo Dependencies

```toml
[dependencies]
pulse-types = { path = "../pulse-types" }
pulse-auth = { path = "../pulse-auth" }
pulse-kv = { path = "../pulse-kv" }
pulse-graph = { path = "../pulse-graph" }
pulse-signal = { path = "../pulse-signal" }
wtransport = "0.4"
sodiumoxide = "0.2"
heed = "0.20"
tokio = { version = "1", features = ["full"] }
tauri = "2"
```

## Key Management

```rust
use sodiumoxide::crypto::sign;

fn generate_keypair() -> (sign::PublicKey, sign::SecretKey) {
    sign::gen_keypair()
}

fn sign_event_id(id: &[u8; 32], sk: &sign::SecretKey) -> [u8; 64] {
    let sig = sign::sign_detached(id, sk);
    sig.0
}
```

Keys stored in OS-native secure storage:
- **macOS**: Keychain
- **Linux**: Secret Service API (via `keyring` crate)
- **Windows**: Windows Credential Manager
