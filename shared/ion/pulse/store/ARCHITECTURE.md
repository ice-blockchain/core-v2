# Pulse Store

Storage adapter interface with LMDB and in-memory implementations.

## API

| Export | Type | Description |
|---|---|---|
| `createLmdbStore` | function | Creates an LMDB-backed persistent store for server use |
| `createMemoryStore` | function | Creates an in-memory store for testing and browser fallback |
| `PulseStore` | type | Common storage interface (get, put, delete, range, batch) |
| `StoreOptions` | type | Configuration for store instances (path, map size, etc.) |

## Dependencies

- `lmdb` -- LMDB bindings for high-performance persistent key-value storage on Node.js

## Design Decisions

- Common interface -- `PulseStore` defines get/put/delete/range so consumers are decoupled from the storage backend
- Batched writes for LMDB -- writes are buffered and flushed every 250ms to amortize fsync overhead; individual puts return immediately
- Platform portability -- LMDB for server, IndexedDB adapter for browser, SQLite adapter for React Native (adapters added per-platform)
- Range queries by prefix -- `range(prefix)` returns all keys under a soul prefix, enabling efficient node property enumeration
