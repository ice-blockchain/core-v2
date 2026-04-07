# @ion/storage Architecture

Cross-platform storage abstraction providing four storage mechanisms: key-value, secure, database (SQLite), and in-memory LRU cache.

## Public API

```typescript
// Factory functions
export { createKeyValueStorage }   // Sync key-value pairs (MMKV / localStorage)
export { createSecureStorage }     // Async encrypted storage (Keychain / Web Crypto)
export { createDatabaseStorage }   // SQLite with migrations (op-sqlite / wa-sqlite)
export { createMemoryStorage }     // In-memory LRU cache with TTL

// Types
export type {
  IKeyValueStorage, ISecureStorage, IDatabaseStorage, IMemoryStorage,
  DatabaseOptions, Migration, Database, Transaction, CacheOptions,
}
```

## Storage Types

| Type | Sync/Async | Native | Web | Use Case |
|------|-----------|--------|-----|----------|
| Key-Value | Sync | MMKV (encrypted) | localStorage (prefixed) | Preferences, flags, small data |
| Secure | Async | react-native-keychain + key registry | Web Crypto AES-GCM | Tokens, keys, secrets |
| Database | Async | op-sqlite (WAL mode) | wa-sqlite (WASM) | Structured data, events, migrations |
| Memory | Sync | Pure JS | Pure JS | Caches, short-lived data |

## Platform Resolution

Each storage type has three files:
- `.ts` -- stub that throws (bundler must resolve)
- `.native.ts` -- React Native implementation
- `.web.ts` -- Browser implementation

Shared logic (e.g., `run-migrations.ts`) is platform-agnostic.

## Key Design Decisions

- **Factory pattern**: `createXxxStorage(id)` returns interface. Multiple instances supported.
- **Namespace isolation**: Key-value storage prefixes keys with `@ion/{id}/` on web.
- **Migration system**: Database tracks applied versions in `__migrations` table. Runs on open.
- **Pending database (web)**: Returns a proxy that buffers operations while WASM SQLite loads.
- **Secure storage (native)**: Uses `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` accessibility level. Registry mutations serialized via async mutex to prevent race conditions.
- **Secure storage (web)**: AES-GCM encryption with PBKDF2-derived keys (100k iterations, SHA-256).
- **LRU eviction**: Prefers expired entries, then lowest priority, then least recently accessed.
- **WAL mode + foreign keys**: Enabled automatically on database open.

## Data Structures

```typescript
interface Migration { version: number; up: string }

interface Database {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  executeBatch(statements: Array<[string, unknown[]?]>): Promise<void>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

interface CacheOptions {
  timeToLiveMs?: number;
  priority?: 'low' | 'normal' | 'high';
}
```

## Dependencies

- **Downstream**: None (foundation layer)
- **Peer deps**: `react-native-mmkv`, `react-native-keychain`, `@op-engineering/op-sqlite` (all optional)
- **Dev deps**: `@journeyapps/wa-sqlite` (web SQLite)
- **Upstream consumers**: `@ion/ion-connect-client`, actions, app shells

## File Structure

```
src/
  index.ts
  types.ts                          # All interfaces
  key-value-storage.ts              # Re-export from platform
  secure-storage.ts                 # Re-export from platform
  database-storage.ts               # Re-export from platform
  memory-storage.ts                 # Pure JS LRU cache
  *.test.ts
  platform/
    key-value-storage.{ts,native.ts,web.ts}
    secure-storage.{ts,native.ts,web.ts}
    database-storage.{ts,native.ts,web.ts}
    run-migrations.ts               # Shared migration runner
    native-modules.d.ts
```
