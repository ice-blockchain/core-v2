# Pulse Sync

## Purpose
CRDT merge engine wrapping Yjs sync protocol for peer-to-peer state synchronization.

## API
- `createPulseSync(config)` -- create sync manager for a document
- `encodePulseState(doc)` -- encode full Y.Doc state as Uint8Array
- `applyPulseUpdate(doc, update)` -- apply remote update to local doc
- `createSyncStep1(doc)` -- create state vector for sync handshake
- `createSyncStep2(doc, stateVector)` -- create diff from state vector

## Dependencies
- `yjs` -- Y.Doc state management
- `y-protocols` -- sync protocol implementation

## Status
Implemented. Two-step sync protocol operational.
