# Pulse Lens

## Purpose
Semantic vector search for social data. ANN search with metadata filtering.

## API
- `createPulseLens(config)` -- create lens instance
- `indexVector(entry)` -- store vector with metadata
- `search(query)` -- ANN search with optional filter
- `deleteVector(soul)` -- remove vector
- `getVectorCount()` -- total indexed vectors

## Algorithm
Current: brute-force cosine similarity (in-memory).
Planned: LanceDB with IVF_PQ/IVF_HNSW indexes for billions of vectors.

## Dependencies
- Currently: none (in-memory)
- Planned: `@lancedb/lancedb`

## Status
In-memory implementation for development. LanceDB integration pending.
