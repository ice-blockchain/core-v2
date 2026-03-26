import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseLens } from '../../../lens/src/index';
import type { PulseLensInstance, PulseVectorEntry } from '../../../lens/src/index';

function buildVectorEntry(overrides: Partial<PulseVectorEntry> & { soul: string }): PulseVectorEntry {
  return {
    soul: overrides.soul,
    embedding: overrides.embedding ?? [1, 0, 0],
    metadata: overrides.metadata ?? {
      soul: overrides.soul,
      labels: [],
    },
  };
}

function createNormalizedVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return values;
  return values.map((value) => value / magnitude);
}

describe('semantic-search', () => {
  let lens: PulseLensInstance;

  beforeEach(() => {
    lens = createPulseLens({ storagePath: '/tmp/test-lens', useLanceDb: false });
  });

  it('indexes vectors and returns them in search results', async () => {
    await lens.indexVector(buildVectorEntry({
      soul: 'doc/1',
      embedding: [1, 0, 0],
    }));

    const results = await lens.search({ embedding: [1, 0, 0], limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].soul).toBe('doc/1');
  });

  it('ranks results by cosine similarity', async () => {
    const queryVector = createNormalizedVector([1, 0, 0]);
    const closeVector = createNormalizedVector([0.9, 0.1, 0]);
    const farVector = createNormalizedVector([0, 0, 1]);

    await lens.indexVector(buildVectorEntry({
      soul: 'doc/close',
      embedding: closeVector,
    }));
    await lens.indexVector(buildVectorEntry({
      soul: 'doc/far',
      embedding: farVector,
    }));

    const results = await lens.search({ embedding: queryVector, limit: 10 });

    expect(results[0].soul).toBe('doc/close');
    expect(results[1].soul).toBe('doc/far');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('respects the limit parameter on search results', async () => {
    for (let i = 0; i < 10; i++) {
      await lens.indexVector(buildVectorEntry({
        soul: `doc/${i}`,
        embedding: createNormalizedVector([Math.random(), Math.random(), Math.random()]),
      }));
    }

    const results = await lens.search({ embedding: [1, 0, 0], limit: 3 });

    expect(results).toHaveLength(3);
  });

  it('returns metadata with search results', async () => {
    await lens.indexVector({
      soul: 'post/42',
      embedding: [1, 0, 0],
      metadata: {
        soul: 'post/42',
        userId: 'alice',
        labels: ['technology', 'ai'],
        contentType: 'article',
      },
    });

    const results = await lens.search({ embedding: [1, 0, 0], limit: 5 });

    expect(results[0].metadata.userId).toBe('alice');
    expect(results[0].metadata.labels).toContain('technology');
    expect(results[0].metadata.contentType).toBe('article');
  });

  it('does not return deleted vectors in search results', async () => {
    await lens.indexVector(buildVectorEntry({
      soul: 'doc/keep',
      embedding: [1, 0, 0],
    }));
    await lens.indexVector(buildVectorEntry({
      soul: 'doc/remove',
      embedding: [0.9, 0.1, 0],
    }));

    await lens.deleteVector('doc/remove');

    const results = await lens.search({ embedding: [1, 0, 0], limit: 10 });

    expect(results).toHaveLength(1);
    expect(results[0].soul).toBe('doc/keep');
  });

  it('tracks vector count after indexing and deletion', async () => {
    await lens.indexVector(buildVectorEntry({ soul: 'a', embedding: [1, 0, 0] }));
    await lens.indexVector(buildVectorEntry({ soul: 'b', embedding: [0, 1, 0] }));
    await lens.indexVector(buildVectorEntry({ soul: 'c', embedding: [0, 0, 1] }));

    expect(await lens.getVectorCount()).toBe(3);

    await lens.deleteVector('b');

    expect(await lens.getVectorCount()).toBe(2);
  });

  it('returns true when deleting existing vector, false otherwise', async () => {
    await lens.indexVector(buildVectorEntry({ soul: 'doc/exists', embedding: [1, 0, 0] }));

    const deletedExisting = await lens.deleteVector('doc/exists');
    const deletedMissing = await lens.deleteVector('doc/nonexistent');

    expect(deletedExisting).toBe(true);
    expect(deletedMissing).toBe(false);
  });

  it('identifies exact matches with highest similarity score', async () => {
    const targetVector = createNormalizedVector([0.5, 0.5, 0.5]);

    await lens.indexVector(buildVectorEntry({
      soul: 'doc/exact',
      embedding: targetVector,
    }));
    await lens.indexVector(buildVectorEntry({
      soul: 'doc/different',
      embedding: createNormalizedVector([1, 0, 0]),
    }));

    const results = await lens.search({ embedding: targetVector, limit: 10 });

    expect(results[0].soul).toBe('doc/exact');
    expect(results[0].score).toBeCloseTo(1.0, 5);
  });
});
