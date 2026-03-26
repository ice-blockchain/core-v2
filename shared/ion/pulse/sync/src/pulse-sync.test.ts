import { describe, it, expect } from 'vitest';
import { createPulseSync, encodePulseState, applyPulseUpdate, createSyncStep1, createSyncStep2 } from './pulse-sync';

describe('createPulseSync', () => {
  it('syncs two documents via step1 and step2', () => {
    const syncA = createPulseSync({ documentId: 'doc-1' });
    const syncB = createPulseSync({ documentId: 'doc-1' });

    syncA.document.getMap('data').set('key', 'value-from-a');

    const step1FromB = syncB.createSyncStep1();
    const step2FromA = syncA.createSyncStep2(step1FromB);
    syncB.applyUpdate(step2FromA);

    const syncedValue = syncB.document.getMap('data').get('key');
    expect(syncedValue).toBe('value-from-a');
  });

  it('converges state after applying updates', () => {
    const syncA = createPulseSync({ documentId: 'doc-2' });
    const syncB = createPulseSync({ documentId: 'doc-2' });

    syncA.document.getMap('data').set('name', 'Alice');

    const updateFromA = syncA.encodeState();
    syncB.applyUpdate(updateFromA);

    const nameInB = syncB.document.getMap('data').get('name');
    expect(nameInB).toBe('Alice');
  });

  it('encodes and decodes state roundtrip', () => {
    const syncA = createPulseSync({ documentId: 'doc-3' });
    syncA.document.getMap('data').set('count', 42);

    const encoded = encodePulseState(syncA.document);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);

    const syncB = createPulseSync({ documentId: 'doc-3' });
    applyPulseUpdate(syncB.document, encoded);

    expect(syncB.document.getMap('data').get('count')).toBe(42);
  });

  it('creates state vector for sync step 1', () => {
    const syncA = createPulseSync({ documentId: 'doc-4' });
    const stateVector = createSyncStep1(syncA.document);

    expect(stateVector).toBeInstanceOf(Uint8Array);
    expect(stateVector.length).toBeGreaterThan(0);
  });

  it('creates diff for sync step 2', () => {
    const syncA = createPulseSync({ documentId: 'doc-5' });
    syncA.document.getMap('data').set('x', 1);

    const syncB = createPulseSync({ documentId: 'doc-5' });
    const remoteVector = createSyncStep1(syncB.document);
    const diff = createSyncStep2(syncA.document, remoteVector);

    expect(diff).toBeInstanceOf(Uint8Array);
    expect(diff.length).toBeGreaterThan(0);
  });
});
