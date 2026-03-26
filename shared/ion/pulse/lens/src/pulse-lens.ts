import type {
  PulseLensConfig,
  PulseLensInstance,
  PulseSearchQuery,
  PulseSearchResult,
  PulseVectorEntry,
} from './types';
import { createLanceDbLens } from './pulse-lens-lancedb';

function computeDotProduct(
  vectorA: number[],
  vectorB: number[],
): number {
  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    sum += vectorA[i] * vectorB[i];
  }
  return sum;
}

function computeMagnitude(vector: number[]): number {
  let sumOfSquares = 0;
  for (const value of vector) {
    sumOfSquares += value * value;
  }
  return Math.sqrt(sumOfSquares);
}

export function cosineSimilarity(
  vectorA: number[],
  vectorB: number[],
): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have equal dimensions');
  }

  const magnitudeA = computeMagnitude(vectorA);
  const magnitudeB = computeMagnitude(vectorB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  const dotProduct = computeDotProduct(vectorA, vectorB);
  return dotProduct / (magnitudeA * magnitudeB);
}

function rankSearchResults(
  store: Map<string, PulseVectorEntry>,
  query: PulseSearchQuery,
): PulseSearchResult[] {
  const results: PulseSearchResult[] = [];

  for (const [, entry] of store) {
    const score = cosineSimilarity(query.embedding, entry.embedding);
    results.push({
      soul: entry.soul,
      score,
      metadata: entry.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  const limit = query.limit ?? 10;
  return results.slice(0, limit);
}

export function createInMemoryLens(): PulseLensInstance {
  const store = new Map<string, PulseVectorEntry>();

  const indexVector = async (
    entry: PulseVectorEntry,
  ): Promise<void> => {
    store.set(entry.soul, entry);
  };

  const search = async (
    query: PulseSearchQuery,
  ): Promise<PulseSearchResult[]> => {
    return rankSearchResults(store, query);
  };

  const deleteVector = async (soul: string): Promise<boolean> => {
    return store.delete(soul);
  };

  const getVectorCount = async (): Promise<number> => {
    return store.size;
  };

  return { indexVector, search, deleteVector, getVectorCount };
}

export function createPulseLens(
  config: PulseLensConfig,
): PulseLensInstance {
  if (config.useLanceDb) {
    return createLanceDbLens(config);
  }
  return createInMemoryLens();
}
