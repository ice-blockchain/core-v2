import type { PulseDocumentEntry, PulseStorageAdapter } from './types.js';

/**
 * React Native / Expo SQLite adapter. Requires expo-sqlite or react-native-sqlite-storage.
 * This is a stub -- full implementation deferred to Phase 13 (platform integration).
 */
export function createSqliteStore(_dbPath?: string): PulseStorageAdapter {
  throw new Error(
    'SQLite adapter is not yet implemented. Use createMemoryStore() for now, ' +
    'or contribute an implementation at store/src/sqlite-adapter.ts'
  );
}
