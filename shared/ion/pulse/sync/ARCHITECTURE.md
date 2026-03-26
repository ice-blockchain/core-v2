# Pulse Sync

CRDT merge engine wrapping the Yjs sync protocol.

## Dependencies
- `yjs` -- Y.Doc sync protocol, state vectors, incremental updates

## API Surface
- `applyPulseUpdate(doc, update)` -- apply incoming Yjs update to local Y.Doc
- `encodePulseState(doc)` -- encode full Y.Doc state for wire transfer
- `encodePulseStateVector(doc)` -- encode state vector for sync negotiation
- `computePulseUpdate(doc, stateVector)` -- compute incremental update from state vector

## Design Decisions
- Y.Map LWW per key handles conflict resolution automatically
- State vectors enable efficient incremental sync
- Full sync on new peer join, incremental thereafter
