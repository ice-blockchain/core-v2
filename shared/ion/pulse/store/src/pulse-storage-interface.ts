import type { PulseStorageAdapter, PulseRangeQuery } from './types';

function collectKeysInRange(store: Map<string, Uint8Array>, options: PulseRangeQuery): string[] {
  const { start, end, limit } = options;
  const results: string[] = [];

  const sortedKeys = Array.from(store.keys()).sort();

  for (const key of sortedKeys) {
    if (key >= start && key <= end) {
      results.push(key);
      if (limit !== undefined && results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

export function createMemoryStorageAdapter(): PulseStorageAdapter {
  const store = new Map<string, Uint8Array>();

  async function saveDocument(docId: string, state: Uint8Array): Promise<void> {
    store.set(docId, state);
  }

  async function loadDocument(docId: string): Promise<Uint8Array | null> {
    return store.get(docId) ?? null;
  }

  async function deleteDocument(docId: string): Promise<boolean> {
    return store.delete(docId);
  }

  async function eraseDocument(docId: string): Promise<boolean> {
    return store.delete(docId);
  }

  async function queryRange(options: PulseRangeQuery): Promise<string[]> {
    return collectKeysInRange(store, options);
  }

  return {
    saveDocument,
    loadDocument,
    deleteDocument,
    eraseDocument,
    queryRange,
  };
}
