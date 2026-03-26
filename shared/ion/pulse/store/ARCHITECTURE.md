# Pulse Store

Platform-specific storage adapters behind a common interface.

## Dependencies
- `lmdb` (server), `y-indexeddb` (browser), `op-sqlite`/`expo-sqlite` (mobile)

## API Surface
- `PulseStorageAdapter` interface:
  - `saveDocument(docId, state)` -- persist Y.Doc encoded state
  - `loadDocument(docId)` -- restore Y.Doc from storage
  - `queryRange(start, end)` -- lexicographic range scan
  - `deleteDocument(docId)` -- remove document
  - `eraseDocument(docId)` -- GDPR hard delete (physical removal)

## Adapters
- `LmdbAdapter` -- server: batched writes, sorted keys, shard persistence
- `IndexedDbAdapter` -- browser: Y.Doc state per user scope
- `SqliteAdapter` -- React Native: blob columns, indexed by soul prefix

## Design Decisions
- Common interface allows swapping adapters per platform
- LMDB chosen for relay servers: 1.9M reads/sec, ACID, memory-mapped, ordered keys
- Batched writes (flush every 250ms) to reduce I/O
