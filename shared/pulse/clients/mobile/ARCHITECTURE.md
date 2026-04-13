# Pulse Mobile Clients

## Android (Kotlin)

| Concern | Library | Notes |
|---------|---------|-------|
| Transport | `Cronet` (Chromium network stack) | Native WebTransport/QUIC support |
| Transport fallback | `OkHttp` | WebSocket or HTTP for older devices |
| Crypto (Ed25519) | `Tink` (Google) or `Bouncy Castle` | Ed25519 sign/verify |
| Local storage | `Room` (SQLite wrapper) | Offline event cache |
| Serialization | `kotlinx.serialization` | Event JSON encoding |

### Room Database Schema

```kotlin
@Entity(tableName = "events")
data class CachedEvent(
    @PrimaryKey val id: ByteArray,       // 32 bytes
    val pubkey: ByteArray,               // 32 bytes
    val createdAt: Long,                 // Unix timestamp
    val kind: Int,                       // Event type
    val tags: String,                    // JSON-encoded tags
    val content: ByteArray,              // Raw payload
    val sig: ByteArray,                  // 64 bytes
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface EventDao {
    @Query("SELECT * FROM events WHERE id = :id")
    suspend fun getById(id: ByteArray): CachedEvent?

    @Query("SELECT * FROM events WHERE kind = :kind ORDER BY createdAt DESC LIMIT :limit")
    suspend fun getByKind(kind: Int, limit: Int = 100): List<CachedEvent>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(event: CachedEvent)
}
```

### Cronet WebTransport Usage

```kotlin
val engine = CronetEngine.Builder(context).build()
// WebTransport session via Cronet's QUIC support
// Bidirectional streams for event submission
// Server-push for subscription updates
```

---

## iOS (Swift)

| Concern | Library | Notes |
|---------|---------|-------|
| Transport | `Network.framework` (Apple) | Native QUIC support, WebTransport via URLSession in iOS 17+ |
| Transport fallback | `URLSession` | HTTP/1.1 + SSE |
| Crypto (Ed25519) | `CryptoKit` (Apple) | `Curve25519.Signing` -- native, hardware-accelerated |
| Local storage | `SwiftData` or `GRDB` (SQLite) | Offline event cache |
| Serialization | `Codable` | Event JSON encoding |

### CryptoKit Ed25519

```swift
import CryptoKit

struct EventSigner {
    let privateKey: Curve25519.Signing.PrivateKey

    func sign(eventId: Data) throws -> Data {
        let signature = try privateKey.signature(for: eventId)
        return signature.rawRepresentation  // 64 bytes
    }

    func verify(eventId: Data, signature: Data, publicKey: Data) -> Bool {
        guard let pubKey = try? Curve25519.Signing.PublicKey(rawRepresentation: publicKey),
              let sig = try? pubKey.isValidSignature(
                  Data(signature),
                  for: eventId
              ) else { return false }
        return sig
    }

    var publicKey: Data {
        privateKey.publicKey.rawRepresentation  // 32 bytes
    }
}
```

### SwiftData Model

```swift
@Model
class CachedEvent {
    @Attribute(.unique) var id: Data       // 32 bytes
    var pubkey: Data                        // 32 bytes
    var createdAt: Int64                    // Unix timestamp
    var kind: Int32                         // Event type
    var tags: String                        // JSON-encoded
    var content: Data                       // Raw payload
    var sig: Data                           // 64 bytes
    var cachedAt: Date = Date()
}
```

### Network.framework QUIC

```swift
let connection = NWConnection(
    host: "relay.example.com",
    port: 4433,
    using: .quic(alpn: ["h3"])
)
connection.start(queue: .main)
// Use connection for WebTransport-style bidirectional streams
```

---

## Shared Client Responsibilities (Both Platforms)

1. **Key management** -- Generate/store Ed25519 keypair (Keychain on iOS, Keystore on Android)
2. **Event construction** -- Build signed events (hash, sign, submit)
3. **Transport client** -- Connect to relay, send requests, receive subscriptions
4. **Local cache** -- Cache received events locally for offline access
5. **Sync protocol** -- Request missed events on reconnect (by timestamp or event ID)

## Optional: Rust FFI Bindings

For shared crypto/storage logic across platforms:

| Tool | Target | Output |
|------|--------|--------|
| `uniffi` (Mozilla) | Kotlin, Swift | Auto-generated bindings from Rust traits |
| `cbindgen` | C/Objective-C | C header generation for Rust FFI |

This allows sharing `pulse-auth` and `pulse-kv` logic across mobile platforms via compiled Rust libraries.
