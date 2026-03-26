# Pulse Lens

Semantic vector search with LanceDB backend and in-memory fallback for testing.

## API

| Export | Type | Description |
|---|---|---|
| `createPulseLens` | function | Creates a LanceDB-backed vector search index (async) |
| `createMemoryLens` | function | Creates an in-memory vector index using cosine similarity |
| `cosineSimilarity` | function | Compute cosine similarity between two number arrays |
| `PulseLens` | type | Vector search interface: index, search, delete, count, close |
| `PulseLensConfig` | type | `{ path, tableName?, dimensions? }` |
| `PulseVectorEntry` | type | `{ soul, vector, metadata }` |
| `PulseVectorMetadata` | type | Flexible metadata: `userId?`, `timestamp?`, `labels?`, `contentType?`, plus arbitrary keys |
| `PulseSearchResult` | type | `{ soul, score, metadata }` |
| `PulseSearchQuery` | type | `{ vector, limit?, filter? }` |

### PulseLens Interface

| Method | Description |
|---|---|
| `indexVector(entry)` | Upsert a single vector entry |
| `indexVectors(entries)` | Batch-index multiple vector entries |
| `search(query)` | K-nearest-neighbor search by vector similarity |
| `deleteVector(soul)` | Remove a vector by soul |
| `getVectorCount()` | Total indexed vectors |
| `close()` | Release resources |

## Dependencies

- `@lancedb/lancedb` -- columnar vector database for production search (optional; memory fallback available)

## Design Decisions

- Memory fallback for testing -- `createMemoryLens` uses brute-force cosine similarity over a Map, no external deps required; `createPulseLens` uses LanceDB for production-grade ANN search
- Lazy table creation -- LanceDB table is created on first write, not at init; avoids errors when connecting to an empty database
- Score normalization -- LanceDB returns `_distance`; converted to `1 - distance` for a 0-1 similarity score consistent with the memory implementation
- Soul-keyed entries -- vectors are indexed by graph soul, tying search results directly back to graph nodes
