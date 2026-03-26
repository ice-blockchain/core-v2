# Pulse Graph

Y.Doc-backed flat graph of nodes with souls and links.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseGraph` | function | Creates a graph instance backed by a Yjs Y.Doc |
| `createPulseNode` | function | Creates a node with a soul identifier and properties |
| `flattenNestedProperties` | function | Denormalizes nested objects into flat key-value pairs |
| `PulseGraph` | type | Graph instance with get/put/query/link operations |
| `PulseNode` | type | Node with soul, properties map, and metadata |
| `Soul` | type | Unique node identifier (string) |

## Dependencies

- `yjs` -- Y.Doc and Y.Map provide the underlying CRDT data structure for conflict-free merges

## Design Decisions

- Flat key-value storage -- nested objects are auto-denormalized into dot-path keys so every property is independently mergeable by Yjs
- Soul-based identity -- every node has a globally unique soul string; references between nodes use soul links rather than nested objects
- Tombstone soft delete -- deleted nodes are marked with a tombstone flag rather than removed, preserving delete intent across CRDT replicas
- Lazy link resolution -- graph queries resolve links on read rather than eagerly materializing relationships
