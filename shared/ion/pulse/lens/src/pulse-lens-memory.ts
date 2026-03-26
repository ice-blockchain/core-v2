import { cosineSimilarity } from './cosine-similarity.js';
import type {
  PulseLens,
  PulseSearchQuery,
  PulseSearchResult,
  PulseVectorEntry,
} from './types.js';

interface MemoryLensConfig {
  dimensions?: number;
}

export function createMemoryLens(config?: MemoryLensConfig): PulseLens {
  const store = new Map<string, PulseVectorEntry>();
  const dimensions = config?.dimensions ?? 0;

  return {
    indexVector: async (entry) => {
      validateEntry(entry, dimensions);
      store.set(entry.soul, entry);
    },

    indexVectors: async (entries) => {
      for (const entry of entries) {
        validateEntry(entry, dimensions);
        store.set(entry.soul, entry);
      }
    },

    search: async (query) => searchStore(store, query),

    deleteVector: async (soul) => store.delete(soul),

    getVectorCount: async () => store.size,

    close: async () => {
      store.clear();
    },
  };
}

function validateEntry(entry: PulseVectorEntry, dimensions: number): void {
  if (dimensions > 0 && entry.vector.length !== dimensions) {
    throw new Error(
      `Vector dimension mismatch: expected ${dimensions}, got ${entry.vector.length}`
    );
  }
}

function parseFilterCondition(condition: string): { field: string; value: string } | null {
  const match = condition.trim().match(/^(\w+)\s*=\s*["'](.*)["']$/);
  if (!match) return null;
  return { field: match[1]!, value: match[2]! };
}

function applyMetadataFilter(entry: PulseVectorEntry, filter: string): boolean {
  const conditions = filter.split(/\s+AND\s+/);
  for (const condition of conditions) {
    const parsed = parseFilterCondition(condition);
    if (!parsed) continue;
    if (String(entry.metadata[parsed.field] ?? '') !== parsed.value) return false;
  }
  return true;
}

function searchStore(
  store: Map<string, PulseVectorEntry>,
  query: PulseSearchQuery
): PulseSearchResult[] {
  const limit = query.limit ?? 10;
  const entries = query.filter
    ? [...store.values()].filter((e) => applyMetadataFilter(e, query.filter!))
    : [...store.values()];
  const results: PulseSearchResult[] = [];

  for (const entry of entries) {
    const score = cosineSimilarity(query.vector, entry.vector);
    results.push({ soul: entry.soul, score, metadata: entry.metadata });
  }

  return sortAndLimitResults(results, limit);
}

function sortAndLimitResults(
  results: PulseSearchResult[],
  limit: number
): PulseSearchResult[] {
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
