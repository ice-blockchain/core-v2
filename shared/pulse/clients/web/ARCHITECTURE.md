# Pulse Web Client

## Stack

| Concern | Library / API | Notes |
|---------|--------------|-------|
| Transport | `WebTransport` API (native browser) | Built into Chrome, Edge, Firefox |
| Transport fallback | `fetch` + `EventSource` (SSE) | Safari until WebTransport ships |
| Crypto (Ed25519) | `@noble/ed25519` or Web Crypto API | Web Crypto has native Ed25519 in Chrome 113+ |
| Local storage | IndexedDB (via `idb` wrapper) | Cached events, user preferences |
| State management | Framework-specific (React, Svelte, etc.) | Reactive updates from subscription stream |

## Responsibilities

1. **Key management** -- Generate/store Ed25519 keypair in IndexedDB (encrypted with user passphrase)
2. **Event construction** -- Build `SignedEvent` (hash content -> id, sign id -> sig, submit)
3. **WebTransport client** -- Connect to relay, send events over bidirectional streams, receive subscriptions over server-push stream
4. **Local cache** -- Cache received events in IndexedDB for offline access
5. **Sync protocol** -- On reconnect, request missed events by timestamp or event ID

## Transport Layer

```
Browser WebTransport API
  -> QUIC/UDP to relay
  -> Bidirectional streams for request/response
  -> Unidirectional server-push stream for subscriptions
```

### Safari Fallback

```
fetch() for POST /events (submit signed events)
EventSource for GET /subscribe (SSE for real-time updates)
fetch() for GET /events (query with filters)
```

## Event Construction (TypeScript)

```typescript
interface SignedEvent {
  id: Uint8Array;       // SHA-256(pubkey || created_at || kind || tags || content)
  pubkey: Uint8Array;   // Ed25519 public key (32 bytes)
  created_at: number;   // Unix timestamp seconds
  kind: number;         // Event type (determines API routing)
  tags: string[][];     // Structured metadata
  content: Uint8Array;  // Payload (JSON for text, raw bytes for binary)
  sig: Uint8Array;      // Ed25519 signature over id (64 bytes)
}

async function createEvent(
  privateKey: Uint8Array,
  kind: number,
  content: Uint8Array,
  tags: string[][] = [],
): Promise<SignedEvent> {
  const pubkey = await ed25519.getPublicKey(privateKey);
  const created_at = Math.floor(Date.now() / 1000);
  const id = await computeEventId(pubkey, created_at, kind, tags, content);
  const sig = await ed25519.sign(id, privateKey);
  return { id, pubkey, created_at, kind, tags, content, sig };
}
```

## Local Storage Schema (IndexedDB)

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `events` | `event.id` | `SignedEvent` | Cached events |
| `profiles` | `pubkey` | Latest kind=0 event | User profiles |
| `subscriptions` | `pattern` | `{ lastSeen: timestamp }` | Sync state |
| `keys` | `"primary"` | Encrypted keypair | User identity |

## Dependencies

```json
{
  "@noble/ed25519": "^2.0.0",
  "idb": "^8.0.0"
}
```
