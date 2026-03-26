import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseLens, cosineSimilarity } from './pulse-lens';
import type { PulseLensInstance } from './types';

describe('pulse-lens', () => {
  let lens: PulseLensInstance;

  beforeEach(() => {
    lens = createPulseLens({ storagePath: '/tmp/test-lens' });
  });

  it('indexes a vector and returns it in search results', async () => {
    await lens.indexVector({
      soul: 'post-1',
      embedding: [1, 0, 0],
      metadata: { soul: 'post-1', contentType: 'text' },
    });

    const results = await lens.search({
      embedding: [1, 0, 0],
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].soul).toBe('post-1');
    expect(results[0].score).toBeCloseTo(1.0);
  });

  it('ranks closer vectors with higher scores', async () => {
    await lens.indexVector({
      soul: 'close',
      embedding: [0.9, 0.1, 0],
      metadata: { soul: 'close' },
    });

    await lens.indexVector({
      soul: 'far',
      embedding: [0, 0, 1],
      metadata: { soul: 'far' },
    });

    const results = await lens.search({
      embedding: [1, 0, 0],
      limit: 10,
    });

    expect(results[0].soul).toBe('close');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('removes vector on deleteVector', async () => {
    await lens.indexVector({
      soul: 'temp',
      embedding: [1, 1, 1],
      metadata: { soul: 'temp' },
    });

    const deleted = await lens.deleteVector('temp');
    expect(deleted).toBe(true);

    const count = await lens.getVectorCount();
    expect(count).toBe(0);
  });

  it('returns correct vector count', async () => {
    expect(await lens.getVectorCount()).toBe(0);

    await lens.indexVector({
      soul: 'a',
      embedding: [1, 0],
      metadata: { soul: 'a' },
    });
    await lens.indexVector({
      soul: 'b',
      embedding: [0, 1],
      metadata: { soul: 'b' },
    });

    expect(await lens.getVectorCount()).toBe(2);
  });

  it('respects the limit parameter on search', async () => {
    for (let i = 0; i < 10; i++) {
      await lens.indexVector({
        soul: `item-${i}`,
        embedding: [Math.random(), Math.random()],
        metadata: { soul: `item-${i}` },
      });
    }

    const results = await lens.search({
      embedding: [0.5, 0.5],
      limit: 3,
    });

    expect(results).toHaveLength(3);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it('throws for vectors of different dimensions', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(
      'Vectors must have equal dimensions',
    );
  });
});
