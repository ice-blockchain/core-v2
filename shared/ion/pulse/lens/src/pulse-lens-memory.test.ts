import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryLens } from './pulse-lens-memory.js';
import type { PulseLens, PulseVectorEntry } from './types.js';

function makeEntry(soul: string, vector: number[]): PulseVectorEntry {
  return { soul, vector, metadata: {} };
}

describe('createMemoryLens', () => {
  let lens: PulseLens;

  beforeEach(() => {
    lens = createMemoryLens();
  });

  it('indexes and searches for similar vectors', async () => {
    await lens.indexVector(makeEntry('a', [1, 0, 0]));
    await lens.indexVector(makeEntry('b', [0, 1, 0]));

    const results = await lens.search({ vector: [1, 0, 0] });

    expect(results[0]!.soul).toBe('a');
    expect(results[0]!.score).toBeCloseTo(1.0);
  });

  it('returns results sorted by similarity descending', async () => {
    await lens.indexVector(makeEntry('exact', [1, 0, 0]));
    await lens.indexVector(makeEntry('similar', [0.9, 0.1, 0]));
    await lens.indexVector(makeEntry('different', [0, 1, 0]));

    const results = await lens.search({ vector: [1, 0, 0] });

    expect(results[0]!.soul).toBe('exact');
    expect(results[1]!.soul).toBe('similar');
    expect(results[2]!.soul).toBe('different');
  });

  it('respects search limit', async () => {
    await lens.indexVector(makeEntry('a', [1, 0, 0]));
    await lens.indexVector(makeEntry('b', [0.9, 0.1, 0]));
    await lens.indexVector(makeEntry('c', [0, 1, 0]));

    const results = await lens.search({ vector: [1, 0, 0], limit: 2 });

    expect(results).toHaveLength(2);
  });

  it('deletes a vector by soul', async () => {
    await lens.indexVector(makeEntry('target', [1, 0, 0]));
    expect(await lens.getVectorCount()).toBe(1);

    const deleted = await lens.deleteVector('target');

    expect(deleted).toBe(true);
    expect(await lens.getVectorCount()).toBe(0);
  });

  it('returns false when deleting a non-existent soul', async () => {
    const deleted = await lens.deleteVector('ghost');
    expect(deleted).toBe(false);
  });

  it('returns correct vector count', async () => {
    expect(await lens.getVectorCount()).toBe(0);

    await lens.indexVector(makeEntry('a', [1, 0]));
    await lens.indexVector(makeEntry('b', [0, 1]));

    expect(await lens.getVectorCount()).toBe(2);
  });

  it('batch inserts with indexVectors', async () => {
    const entries = [
      makeEntry('a', [1, 0, 0]),
      makeEntry('b', [0, 1, 0]),
      makeEntry('c', [0, 0, 1]),
    ];

    await lens.indexVectors(entries);

    expect(await lens.getVectorCount()).toBe(3);
  });

  it('overwrites existing entry on re-index', async () => {
    await lens.indexVector({ soul: 'a', vector: [1, 0], metadata: { userId: 'old' } });
    await lens.indexVector({ soul: 'a', vector: [0, 1], metadata: { userId: 'new' } });

    expect(await lens.getVectorCount()).toBe(1);
    const results = await lens.search({ vector: [0, 1] });
    expect(results[0]!.metadata.userId).toBe('new');
  });

  it('clears store on close', async () => {
    await lens.indexVector(makeEntry('a', [1, 0]));
    await lens.close();

    expect(await lens.getVectorCount()).toBe(0);
  });
});
