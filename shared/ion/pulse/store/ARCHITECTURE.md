# Pulse Store

## Purpose
Platform-specific storage adapters behind a common interface.

## API
- `PulseStorageAdapter` interface: saveDocument, loadDocument, deleteDocument, eraseDocument, queryRange
- `createMemoryStorageAdapter()` -- in-memory adapter for testing
- `createLmdbAdapter(config)` -- LMDB adapter for relay servers
- `createIndexedDbAdapter()` -- browser adapter (stub)
- `createSqliteAdapter()` -- React Native adapter (stub)

## Dependencies
- `lmdb` -- LMDB bindings for Node.js (server adapter)

## Config
- LMDB: `path`, `mapSize`, `maxDbs`

## Status
Memory adapter and LMDB adapter implemented. IndexedDB and SQLite are stubs.
