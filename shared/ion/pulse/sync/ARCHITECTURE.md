# Pulse Sync

Wraps Yjs sync protocol for P2P document synchronization.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseSync` | function | Creates a sync manager for a Y.Doc with state vector exchange |
| `PulseSync` | type | Sync instance with encode/apply/getStateVector operations |
| `SyncMessage` | type | Encoded sync step (step1 / step2 / update) |

## Dependencies

- `yjs` -- Y.Doc as the synchronized document
- `y-protocols` -- sync protocol implementation (state vector exchange, update encoding)

## Design Decisions

- LWW per key via Y.Map -- each property in a node is a Y.Map entry; Yjs resolves concurrent writes with last-writer-wins semantics per key
- State vector exchange -- peers exchange compact state vectors to determine missing updates, minimizing bandwidth
- Update-only after initial sync -- after the initial step1/step2 handshake, only incremental updates are transmitted
- Transport agnostic -- sync produces and consumes binary buffers; the transport layer (Mesh) handles delivery
