import { describe, it, expect, beforeEach } from 'vitest';

import { createMemoryStorageAdapter } from './pulse-storage-interface';
import type { PulseStorageAdapter } from './types';

describe('PulseStorageAdapter (memory implementation)', () => {
  let adapter: PulseStorageAdapter;

  beforeEach(() => {
    adapter = createMemoryStorageAdapter();
  });

  it('saves and loads a document roundtrip', async () => {
    const state = new Uint8Array([10, 20, 30, 40]);
    await adapter.saveDocument('doc-1', state);

    const loaded = await adapter.loadDocument('doc-1');

    expect(loaded).toEqual(state);
  });

  it('returns null for non-existent document', async () => {
    const loaded = await adapter.loadDocument('nonexistent');

    expect(loaded).toBeNull();
  });

  it('overwrites existing document on save', async () => {
    const original = new Uint8Array([1, 2, 3]);
    const updated = new Uint8Array([4, 5, 6]);

    await adapter.saveDocument('doc-overwrite', original);
    await adapter.saveDocument('doc-overwrite', updated);

    const loaded = await adapter.loadDocument('doc-overwrite');
    expect(loaded).toEqual(updated);
  });

  it('deletes an existing document and returns true', async () => {
    const state = new Uint8Array([7, 8, 9]);
    await adapter.saveDocument('doc-delete', state);

    const deleted = await adapter.deleteDocument('doc-delete');

    expect(deleted).toBe(true);
    expect(await adapter.loadDocument('doc-delete')).toBeNull();
  });

  it('returns false when deleting non-existent document', async () => {
    const deleted = await adapter.deleteDocument('never-saved');

    expect(deleted).toBe(false);
  });

  it('erases a document physically and returns true', async () => {
    const state = new Uint8Array([11, 12]);
    await adapter.saveDocument('doc-erase', state);

    const erased = await adapter.eraseDocument('doc-erase');

    expect(erased).toBe(true);
    expect(await adapter.loadDocument('doc-erase')).toBeNull();
  });

  it('returns false when erasing non-existent document', async () => {
    const erased = await adapter.eraseDocument('ghost-doc');

    expect(erased).toBe(false);
  });

  it('queries keys within a range', async () => {
    await adapter.saveDocument('alpha', new Uint8Array([1]));
    await adapter.saveDocument('beta', new Uint8Array([2]));
    await adapter.saveDocument('gamma', new Uint8Array([3]));
    await adapter.saveDocument('delta', new Uint8Array([4]));

    const results = await adapter.queryRange({
      start: 'beta',
      end: 'gamma',
    });

    expect(results).toContain('beta');
    expect(results).toContain('delta');
    expect(results).toContain('gamma');
    expect(results).not.toContain('alpha');
  });

  it('respects limit in range queries', async () => {
    await adapter.saveDocument('key-a', new Uint8Array([1]));
    await adapter.saveDocument('key-b', new Uint8Array([2]));
    await adapter.saveDocument('key-c', new Uint8Array([3]));
    await adapter.saveDocument('key-d', new Uint8Array([4]));

    const results = await adapter.queryRange({
      start: 'key-a',
      end: 'key-d',
      limit: 2,
    });

    expect(results).toHaveLength(2);
  });

  it('returns empty array for range with no matches', async () => {
    await adapter.saveDocument('aaa', new Uint8Array([1]));

    const results = await adapter.queryRange({
      start: 'zzz-start',
      end: 'zzz-end',
    });

    expect(results).toEqual([]);
  });
});
