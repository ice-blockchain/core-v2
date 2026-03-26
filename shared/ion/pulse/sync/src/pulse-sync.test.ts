import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { createPulseSync } from './pulse-sync.js';

function createTestDoc(): Y.Doc {
  return new Y.Doc();
}

function putValue(doc: Y.Doc, key: string, value: string): void {
  doc.getMap('data').set(key, value);
}

describe('createPulseSync', () => {
  it('applies update from one doc to another achieving convergence', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    const sync1 = createPulseSync(doc1);
    const sync2 = createPulseSync(doc2);

    putValue(doc1, 'greeting', 'hello');
    const stateFromDoc1 = sync1.encodePulseState();

    sync2.applyPulseUpdate(stateFromDoc1);
    expect(doc2.getMap('data').get('greeting')).toBe('hello');

    sync1.destroy();
    sync2.destroy();
  });

  it('encodes and compares state vectors', () => {
    const doc = createTestDoc();
    const sync = createPulseSync(doc);

    const vectorBefore = sync.encodePulseStateVector();
    putValue(doc, 'key', 'value');
    const vectorAfter = sync.encodePulseStateVector();

    expect(vectorBefore).not.toEqual(vectorAfter);

    sync.destroy();
  });

  it('computes diff between diverged docs', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    const sync1 = createPulseSync(doc1);
    const sync2 = createPulseSync(doc2);

    putValue(doc1, 'exclusive', 'only-in-doc1');

    const remoteVector = sync2.encodePulseStateVector();
    const diff = sync1.computePulseSync(remoteVector);

    expect(diff).not.toBeNull();
    sync2.applyPulseUpdate(diff!);
    expect(doc2.getMap('data').get('exclusive')).toBe('only-in-doc1');

    sync1.destroy();
    sync2.destroy();
  });

  it('returns null from computePulseSync when docs are in sync', () => {
    const doc1 = createTestDoc();
    const doc2 = createTestDoc();
    const sync1 = createPulseSync(doc1);
    const sync2 = createPulseSync(doc2);

    const remoteVector = sync2.encodePulseStateVector();
    const diff = sync1.computePulseSync(remoteVector);
    expect(diff).toBeNull();

    sync1.destroy();
    sync2.destroy();
  });

  it('fires onUpdate callback when changes occur', () => {
    const doc = createTestDoc();
    const sync = createPulseSync(doc);
    const callback = vi.fn();

    sync.onUpdate(callback);
    putValue(doc, 'trigger', 'fire');

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]![0]).toBeInstanceOf(Uint8Array);

    sync.destroy();
  });

  it('unsubscribes via returned function from onUpdate', () => {
    const doc = createTestDoc();
    const sync = createPulseSync(doc);
    const callback = vi.fn();

    const unsubscribe = sync.onUpdate(callback);
    unsubscribe();
    putValue(doc, 'silent', 'no-fire');

    expect(callback).not.toHaveBeenCalled();

    sync.destroy();
  });

  it('cleans up observers on destroy', () => {
    const doc = createTestDoc();
    const sync = createPulseSync(doc);
    const callback = vi.fn();

    sync.onUpdate(callback);
    sync.destroy();
    putValue(doc, 'post-destroy', 'ignored');

    expect(callback).not.toHaveBeenCalled();
  });

  it('tracks pending update count in getSyncState', () => {
    const doc = createTestDoc();
    const sync = createPulseSync(doc);

    expect(sync.getSyncState().pendingUpdates).toBe(0);

    putValue(doc, 'a', '1');
    putValue(doc, 'b', '2');

    expect(sync.getSyncState().pendingUpdates).toBe(2);

    sync.destroy();
  });
});
