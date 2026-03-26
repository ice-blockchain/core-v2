# Pulse Graph

## Purpose
Graph data model with flat nodes, souls (unique IDs), links, and auto-denormalization.

## API
- `createPulseNode(soul, properties)` -- create a node with metadata
- `createPulseGraph(config?)` -- create graph instance backed by Y.Doc
- `pulsePut(graph, soul, data)` -- upsert node, auto-denormalize nested objects
- `pulseGet(graph, soul)` -- retrieve node
- `pulseDelete(graph, soul)` -- soft delete (tombstone)
- `pulseQuery(graph, options)` -- prefix-based range query

## Dependencies
- `yjs` -- Y.Doc and Y.Map for CRDT-backed storage

## Config
- `partitionId` -- optional partition identifier for multi-doc graphs

## Status
Implemented with in-memory Y.Doc. Persistence via Pulse Store adapters.
