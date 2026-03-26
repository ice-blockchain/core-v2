import type { PulseDocumentEntry, PulseStorageAdapter } from './types.js';

/**
 * Browser-only IndexedDB adapter. Requires idb or native IndexedDB API.
 * This is a stub -- full implementation deferred to Phase 13 (platform integration).
 */
export function createIndexedDbStore(_dbName?: string): PulseStorageAdapter {
  throw new Error(
    'IndexedDB adapter is not yet implemented. Use createMemoryStore() for now, ' +
    'or contribute an implementation at store/src/indexeddb-adapter.ts'
  );
}
