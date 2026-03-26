import { open } from 'lmdb';

import type { PulseStorageAdapter, PulseLmdbConfig, PulseRangeQuery } from './types';

const DEFAULT_MAP_SIZE = 1024 * 1024 * 1024;
const DEFAULT_MAX_DBS = 4;

function createDatabase(config: PulseLmdbConfig) {
  return open({
    path: config.path,
    mapSize: config.mapSize ?? DEFAULT_MAP_SIZE,
    maxDbs: config.maxDbs ?? DEFAULT_MAX_DBS,
  });
}

function collectRangeKeys(database: ReturnType<typeof open>, options: PulseRangeQuery): string[] {
  const { start, end, limit } = options;
  const results: string[] = [];
  const range = database.getRange({ start, end });

  for (const { key } of range) {
    results.push(String(key));
    if (limit !== undefined && results.length >= limit) {
      break;
    }
  }

  return results;
}

export function createLmdbAdapter(config: PulseLmdbConfig): PulseStorageAdapter {
  const database = createDatabase(config);

  async function saveDocument(docId: string, state: Uint8Array): Promise<void> {
    await database.put(docId, state);
  }

  async function loadDocument(docId: string): Promise<Uint8Array | null> {
    const value = database.get(docId) as Uint8Array | undefined;
    return value ?? null;
  }

  async function deleteDocument(docId: string): Promise<boolean> {
    const exists = database.get(docId) !== undefined;
    if (exists) {
      await database.remove(docId);
    }
    return exists;
  }

  async function eraseDocument(docId: string): Promise<boolean> {
    const exists = database.get(docId) !== undefined;
    if (exists) {
      await database.remove(docId);
    }
    return exists;
  }

  async function queryRange(options: PulseRangeQuery): Promise<string[]> {
    return collectRangeKeys(database, options);
  }

  return {
    saveDocument,
    loadDocument,
    deleteDocument,
    eraseDocument,
    queryRange,
  };
}
