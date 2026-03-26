import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createLmdbStore } from './lmdb-adapter.js';
import type { PulseStorageAdapter } from './types.js';

describe('createLmdbStore', () => {
  let store: PulseStorageAdapter;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pulse-lmdb-'));
    store = createLmdbStore({ path: tempDir, flushIntervalMs: 0 });
  });

  afterEach(async () => {
    await store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('saves and loads a document round-trip', async () => {
    const state = new Uint8Array([1, 2, 3, 4]);
    await store.saveDocument('doc-1', state);

    const loaded = await store.loadDocument('doc-1');
    expect(loaded).toEqual(state);
  });

  it('returns null for a non-existent document', async () => {
    const loaded = await store.loadDocument('missing');
    expect(loaded).toBeNull();
  });

  it('deletes a document', async () => {
    const state = new Uint8Array([10, 20]);
    await store.saveDocument('doc-del', state);
    await store.loadDocument('doc-del');

    const deleted = await store.deleteDocument('doc-del');
    expect(deleted).toBe(true);

    const loaded = await store.loadDocument('doc-del');
    expect(loaded).toBeNull();
  });

  it('returns false when deleting a non-existent document', async () => {
    const deleted = await store.deleteDocument('ghost');
    expect(deleted).toBe(false);
  });

  it('erases a document', async () => {
    const state = new Uint8Array([5, 6, 7]);
    await store.saveDocument('doc-erase', state);
    await store.loadDocument('doc-erase');

    const erased = await store.eraseDocument('doc-erase');
    expect(erased).toBe(true);

    const loaded = await store.loadDocument('doc-erase');
    expect(loaded).toBeNull();
  });

  it('returns false when erasing a non-existent document', async () => {
    const erased = await store.eraseDocument('ghost');
    expect(erased).toBe(false);
  });

  it('queries documents within a range', async () => {
    await store.saveDocument('a/1', new Uint8Array([1]));
    await store.saveDocument('a/2', new Uint8Array([2]));
    await store.saveDocument('a/3', new Uint8Array([3]));
    await store.saveDocument('b/1', new Uint8Array([4]));

    const results = await store.queryRange('a/', 'b/');
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.docId)).toEqual(['a/1', 'a/2', 'a/3']);
  });

  it('returns empty array for a range with no matches', async () => {
    await store.saveDocument('x/1', new Uint8Array([1]));
    const results = await store.queryRange('z/', 'z~');
    expect(results).toHaveLength(0);
  });

  it('lists all documents when no prefix is given', async () => {
    await store.saveDocument('alpha', new Uint8Array([1]));
    await store.saveDocument('beta', new Uint8Array([2]));

    const docs = await store.listDocuments();
    expect(docs).toEqual(['alpha', 'beta']);
  });

  it('lists documents filtered by prefix', async () => {
    await store.saveDocument('user/1', new Uint8Array([1]));
    await store.saveDocument('user/2', new Uint8Array([2]));
    await store.saveDocument('post/1', new Uint8Array([3]));

    const docs = await store.listDocuments('user/');
    expect(docs).toEqual(['user/1', 'user/2']);
  });
});
