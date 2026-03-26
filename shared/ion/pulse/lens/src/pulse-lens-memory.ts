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

function searchStore(
  store: Map<string, PulseVectorEntry>,
  query: PulseSearchQuery
): PulseSearchResult[] {
  const limit = query.limit ?? 10;
  const results: PulseSearchResult[] = [];

  for (const entry of store.values()) {
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
