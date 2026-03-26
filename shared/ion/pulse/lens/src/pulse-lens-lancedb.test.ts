import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLanceDbLens } from './pulse-lens-lancedb';
import type { PulseLensInstance } from './types';

describe('createLanceDbLens', () => {
  let lens: PulseLensInstance;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pulse-lance-'));
    lens = createLanceDbLens({ storagePath: tempDir });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores and retrieves a vector via search', async () => {
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
    expect(results[0].score).toBeGreaterThan(0.9);
  });

  it('returns nearest neighbors ranked by score', async () => {
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

  it('removes entry on deleteVector', async () => {
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

  it('returns false when deleting nonexistent soul', async () => {
    await lens.indexVector({
      soul: 'keep',
      embedding: [1, 0],
      metadata: { soul: 'keep' },
    });

    const deleted = await lens.deleteVector('nonexistent');
    expect(deleted).toBe(false);
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

  it('upserts when indexing same soul twice', async () => {
    await lens.indexVector({
      soul: 'dup',
      embedding: [1, 0],
      metadata: { soul: 'dup', contentType: 'text' },
    });

    await lens.indexVector({
      soul: 'dup',
      embedding: [0, 1],
      metadata: { soul: 'dup', contentType: 'image' },
    });

    const count = await lens.getVectorCount();
    expect(count).toBe(1);

    const results = await lens.search({
      embedding: [0, 1],
      limit: 1,
    });
    expect(results[0].soul).toBe('dup');
    expect(results[0].metadata.contentType).toBe('image');
  });

  it('preserves metadata through index and search', async () => {
    await lens.indexVector({
      soul: 'rich',
      embedding: [1, 0, 0],
      metadata: {
        soul: 'rich',
        userId: 'user-42',
        timestamp: 1700000000,
        labels: ['important', 'flagged'],
        contentType: 'post',
      },
    });

    const results = await lens.search({
      embedding: [1, 0, 0],
      limit: 1,
    });

    expect(results[0].metadata.userId).toBe('user-42');
    expect(results[0].metadata.timestamp).toBe(1700000000);
    expect(results[0].metadata.labels).toEqual([
      'important',
      'flagged',
    ]);
    expect(results[0].metadata.contentType).toBe('post');
  });
});
