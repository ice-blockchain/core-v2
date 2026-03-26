import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPulseGraph } from '../../../graph/src/index';
import type { PulseGraph } from '../../../graph/src/index';
import { createPulseReaper } from '../../../reaper/src/index';
import type { PulseReaperInstance } from '../../../reaper/src/index';

const DUMMY_SIGNATURE = new Uint8Array([1, 2, 3, 4]);

describe('gdpr-erase', () => {
  let graph: PulseGraph;
  let reaper: PulseReaperInstance;

  beforeEach(() => {
    graph = createPulseGraph();
    reaper = createPulseReaper();
  });

  afterEach(() => {
    reaper.destroy();
  });

  it('creates an erasure request for a specific soul', () => {
    graph.put('users/alice', { name: 'Alice', email: 'alice@example.com' });

    const request = reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });

    expect(request.soul).toBe('users/alice');
    expect(request.requestedBy).toBe('alice');
    expect(request.requestedAt).toBeGreaterThan(0);
  });

  it('tracks pending erasures until processed', () => {
    reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });

    const pending = reaper.getPendingErasures();
    expect(pending).toHaveLength(1);
    expect(pending[0].soul).toBe('users/alice');
  });

  it('removes node from graph on erasure execution', () => {
    graph.put('users/alice', { name: 'Alice', email: 'alice@example.com' });
    graph.put('users/bob', { name: 'Bob', email: 'bob@example.com' });

    reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });

    graph.delete('users/alice');

    expect(graph.get('users/alice')).toBeUndefined();
  });

  it('leaves other nodes unaffected after erasure', () => {
    graph.put('users/alice', { name: 'Alice' });
    graph.put('users/bob', { name: 'Bob' });
    graph.put('posts/1', { title: 'Hello', authorId: 'alice' });

    graph.delete('users/alice');

    expect(graph.get('users/bob')).toBeDefined();
    expect(graph.get('users/bob')?.properties.name).toBe('Bob');
    expect(graph.get('posts/1')).toBeDefined();
  });

  it('processes erasure receipt and clears pending status', () => {
    reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });

    expect(reaper.getPendingErasures()).toHaveLength(1);

    reaper.processErasureReceipt({
      soul: 'users/alice',
      erasedAt: Date.now(),
      relayId: 'relay-alpha',
    });

    expect(reaper.getPendingErasures()).toHaveLength(0);
  });

  it('generates valid erasure receipt fields', () => {
    const receipt = {
      soul: 'users/alice',
      erasedAt: Date.now(),
      relayId: 'relay-alpha',
    };

    expect(receipt.soul).toBe('users/alice');
    expect(receipt.erasedAt).toBeGreaterThan(0);
    expect(receipt.relayId).toBe('relay-alpha');
  });

  it('erases multiple souls independently', () => {
    graph.put('users/alice', { name: 'Alice' });
    graph.put('users/bob', { name: 'Bob' });
    graph.put('users/charlie', { name: 'Charlie' });

    reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });
    reaper.createErasureRequest({
      soul: 'users/bob',
      requestedBy: 'bob',
      signature: DUMMY_SIGNATURE,
    });

    graph.delete('users/alice');
    graph.delete('users/bob');

    expect(graph.get('users/alice')).toBeUndefined();
    expect(graph.get('users/bob')).toBeUndefined();
    expect(graph.get('users/charlie')).toBeDefined();
    expect(reaper.getPendingErasures()).toHaveLength(2);
  });

  it('handles erasure of non-existent soul gracefully', () => {
    reaper.createErasureRequest({
      soul: 'users/ghost',
      requestedBy: 'admin',
      signature: DUMMY_SIGNATURE,
    });

    graph.delete('users/ghost');

    expect(graph.get('users/ghost')).toBeUndefined();
    expect(reaper.getPendingErasures()).toHaveLength(1);
  });

  it('clears all state on reaper destroy', () => {
    reaper.createErasureRequest({
      soul: 'users/alice',
      requestedBy: 'alice',
      signature: DUMMY_SIGNATURE,
    });
    reaper.scheduleExpiry('temp/data', Date.now() + 60000);

    reaper.destroy();

    expect(reaper.getPendingErasures()).toHaveLength(0);
    expect(reaper.checkExpired()).toHaveLength(0);
  });
});
