# Pulse Graph

Graph data model engine. Manages nodes (souls), properties, links, and auto-denormalization.

## Dependencies
- `yjs` -- Y.Doc and Y.Map for CRDT-backed graph storage

## API Surface
- `createPulseNode(soul, properties)` -- create a node instance
- `createPulseGraph()` -- create a graph engine backed by Y.Doc
  - `pulsePut(soul, data)` -- create/update node, auto-denormalize nested objects
  - `pulseGet(soul)` -- retrieve node by soul
  - `pulseDelete(soul)` -- soft delete (tombstone)
  - `pulseQuery(options)` -- lexicographic range query by soul prefix

## Data Structures
- `PulseNode` -- `{ soul, properties, meta }`
- `PulseLink` -- `{ "#": targetSoul }`
- `PulseMeta` -- `{ soul, createdAt, updatedAt, isDeleted, expiresAt? }`

## Design Decisions
- Flat graph: nested objects auto-denormalized into separate nodes with soul references
- One Y.Doc per graph partition
- Souls are unique string identifiers (user-specified or auto-generated UUIDs)
- Circular references allowed via PulseLink
