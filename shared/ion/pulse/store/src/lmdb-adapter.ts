import { open, type Database } from 'lmdb';
import type { PulseDocumentEntry, PulseStoreConfig, PulseStorageAdapter } from './types.js';

interface StoredDocument {
  state: Buffer;
  updatedAt: number;
}

interface PendingWrite {
  docId: string;
  value: StoredDocument | null;
}

const DEFAULT_FLUSH_INTERVAL_MS = 250;

function openDatabase(config: PulseStoreConfig): Database<StoredDocument, string> {
  return open<StoredDocument, string>({
    path: config.path,
    maxDbs: 1,
    mapSize: config.maxDatabaseSize,
  });
}

function toDocumentEntry(docId: string, stored: StoredDocument): PulseDocumentEntry {
  return {
    docId,
    state: new Uint8Array(stored.state),
    updatedAt: stored.updatedAt,
  };
}

function startFlushTimer(options: {
  intervalMs: number;
  onFlush: () => Promise<void>;
}): ReturnType<typeof setInterval> {
  return setInterval(() => void options.onFlush(), options.intervalMs);
}

export function createLmdbStore(config: PulseStoreConfig): PulseStorageAdapter {
  const database = openDatabase(config);
  const pendingWrites: PendingWrite[] = [];
  const flushIntervalMs = config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  async function flushPendingWrites(): Promise<void> {
    if (pendingWrites.length === 0) return;
    const batch = pendingWrites.splice(0, pendingWrites.length);

    await database.transaction(() => {
      for (const write of batch) {
        if (write.value === null) {
          database.remove(write.docId);
        } else {
          database.put(write.docId, write.value);
        }
      }
    });
  }

  function ensureFlushTimer(): void {
    if (flushTimer !== null) return;
    flushTimer = startFlushTimer({
      intervalMs: flushIntervalMs,
      onFlush: flushPendingWrites,
    });
  }

  function enqueuePendingWrite(docId: string, value: StoredDocument | null): void {
    pendingWrites.push({ docId, value });
    ensureFlushTimer();
  }

  function stopFlushTimer(): void {
    if (flushTimer === null) return;
    clearInterval(flushTimer);
    flushTimer = null;
  }

  return {
    async saveDocument(docId: string, state: Uint8Array): Promise<void> {
      const stored: StoredDocument = {
        state: Buffer.from(state),
        updatedAt: Date.now(),
      };
      enqueuePendingWrite(docId, stored);
    },

    async loadDocument(docId: string): Promise<Uint8Array | null> {
      await flushPendingWrites();
      const stored = database.get(docId);
      if (!stored) return null;
      return new Uint8Array(stored.state);
    },

    async queryRange(start: string, end: string): Promise<PulseDocumentEntry[]> {
      await flushPendingWrites();
      const results: PulseDocumentEntry[] = [];
      for (const { key, value } of database.getRange({ start, end })) {
        results.push(toDocumentEntry(key as string, value));
      }
      return results;
    },

    async deleteDocument(docId: string): Promise<boolean> {
      const exists = database.doesExist(docId);
      if (!exists) return false;
      enqueuePendingWrite(docId, null);
      await flushPendingWrites();
      return true;
    },

    async eraseDocument(docId: string): Promise<boolean> {
      const exists = database.doesExist(docId);
      if (!exists) return false;
      enqueuePendingWrite(docId, null);
      await flushPendingWrites();
      return true;
    },

    async listDocuments(prefix?: string): Promise<string[]> {
      await flushPendingWrites();
      const keys: string[] = [];
      for (const { key } of database.getRange({})) {
        const keyStr = key as string;
        if (!prefix || keyStr.startsWith(prefix)) {
          keys.push(keyStr);
        }
      }
      return keys;
    },

    async close(): Promise<void> {
      stopFlushTimer();
      await flushPendingWrites();
      await database.close();
    },
  };
}
