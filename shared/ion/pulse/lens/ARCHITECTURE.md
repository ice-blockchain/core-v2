# Pulse Lens

Semantic vector search using LanceDB embedded vector database.

## Dependencies
- `@lancedb/lancedb` -- embedded vector DB with ANN search

## API Surface
- `createPulseLens(config)` -- initialize LanceDB instance
  - `createPulseLensTable(name, schema)` -- create vector table with metadata columns
  - `indexPulseVector(soul, embedding, metadata)` -- insert/upsert vector
  - `pulseSemanticSearch(query)` -- ANN search with SQL WHERE filters
  - `pulseHybridSearch(query)` -- vector + BM25 + metadata combined search

## Design Decisions
- LMDB stores the graph; LanceDB stores vector embeddings alongside metadata
- Background sync: new graph writes generate embeddings and index into LanceDB
- Index type auto-selected: IVF_PQ for large tables, flat for small tables
- Metadata columns: soul, userId, timestamp, labels, contentType
