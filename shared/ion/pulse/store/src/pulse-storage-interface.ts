import type { PulseDocumentEntry, PulseStorageAdapter } from './types.js';

interface MemoryEntry {
  state: Uint8Array;
  updatedAt: number;
}

function buildDocumentEntry(docId: string, entry: MemoryEntry): PulseDocumentEntry {
  return { docId, state: entry.state, updatedAt: entry.updatedAt };
}

function filterKeysByPrefix(keys: string[], prefix?: string): string[] {
  if (!prefix) return keys;
  return keys.filter((key) => key.startsWith(prefix));
}

export function createMemoryStore(): PulseStorageAdapter {
  const store = new Map<string, MemoryEntry>();

  return {
    async saveDocument(docId: string, state: Uint8Array): Promise<void> {
      store.set(docId, { state, updatedAt: Date.now() });
    },

    async loadDocument(docId: string): Promise<Uint8Array | null> {
      const entry = store.get(docId);
      return entry ? entry.state : null;
    },

    async queryRange(start: string, end: string): Promise<PulseDocumentEntry[]> {
      const results: PulseDocumentEntry[] = [];
      for (const [docId, entry] of store) {
        if (docId >= start && docId < end) {
          results.push(buildDocumentEntry(docId, entry));
        }
      }
      return results.sort((a, b) => a.docId.localeCompare(b.docId));
    },

    async deleteDocument(docId: string): Promise<boolean> {
      return store.delete(docId);
    },

    async eraseDocument(docId: string): Promise<boolean> {
      return store.delete(docId);
    },

    async listDocuments(prefix?: string): Promise<string[]> {
      const keys = Array.from(store.keys());
      return filterKeysByPrefix(keys, prefix).sort();
    },

    async close(): Promise<void> {
      store.clear();
    },
  };
}
