import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseGraph } from '../../../graph/src/index';
import type { PulseGraph } from '../../../graph/src/index';
import { encodePulseState, applyPulseUpdate } from '../../../sync/src/index';

function syncGraphToGraph(source: PulseGraph, target: PulseGraph): void {
  const update = encodePulseState(source.document);
  applyPulseUpdate(target.document, update);
}

describe('offline-reconciliation', () => {
  let graphAlpha: PulseGraph;
  let graphBeta: PulseGraph;

  beforeEach(() => {
    graphAlpha = createPulseGraph();
    graphBeta = createPulseGraph();
  });

  it('syncs initial state from one graph to another', () => {
    graphAlpha.put('users/alice', { name: 'Alice', age: 30 });

    syncGraphToGraph(graphAlpha, graphBeta);

    const aliceInBeta = graphBeta.get('users/alice');
    expect(aliceInBeta).toBeDefined();
    expect(aliceInBeta?.properties.name).toBe('Alice');
  });

  it('merges independent offline writes from both peers', () => {
    graphAlpha.put('shared/config', { version: 1 });
    syncGraphToGraph(graphAlpha, graphBeta);

    graphAlpha.put('users/alice', { name: 'Alice', role: 'admin' });
    graphBeta.put('users/bob', { name: 'Bob', role: 'user' });

    syncGraphToGraph(graphAlpha, graphBeta);
    syncGraphToGraph(graphBeta, graphAlpha);

    expectBothGraphsHaveNode(graphAlpha, graphBeta, 'users/alice');
    expectBothGraphsHaveNode(graphAlpha, graphBeta, 'users/bob');
  });

  it('preserves all properties after bidirectional sync', () => {
    graphAlpha.put('posts/1', { title: 'Hello', authorId: 'alice' });
    graphBeta.put('posts/2', { title: 'World', authorId: 'bob' });

    syncGraphToGraph(graphAlpha, graphBeta);
    syncGraphToGraph(graphBeta, graphAlpha);

    const post1InBeta = graphBeta.get('posts/1');
    expect(post1InBeta?.properties.title).toBe('Hello');
    expect(post1InBeta?.properties.authorId).toBe('alice');

    const post2InAlpha = graphAlpha.get('posts/2');
    expect(post2InAlpha?.properties.title).toBe('World');
    expect(post2InAlpha?.properties.authorId).toBe('bob');
  });

  it('handles multiple rounds of offline writes and syncs', () => {
    graphAlpha.put('counter/a', { value: 1 });
    syncGraphToGraph(graphAlpha, graphBeta);

    graphAlpha.put('counter/b', { value: 2 });
    graphBeta.put('counter/c', { value: 3 });

    syncGraphToGraph(graphAlpha, graphBeta);
    syncGraphToGraph(graphBeta, graphAlpha);

    graphAlpha.put('counter/d', { value: 4 });
    graphBeta.put('counter/e', { value: 5 });

    syncGraphToGraph(graphAlpha, graphBeta);
    syncGraphToGraph(graphBeta, graphAlpha);

    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      expectBothGraphsHaveNode(graphAlpha, graphBeta, `counter/${key}`);
    }
  });

  it('converges to identical state after full bidirectional sync', () => {
    graphAlpha.put('data/1', { value: 'alpha-1' });
    graphAlpha.put('data/2', { value: 'alpha-2' });
    graphBeta.put('data/3', { value: 'beta-3' });
    graphBeta.put('data/4', { value: 'beta-4' });

    syncGraphToGraph(graphAlpha, graphBeta);
    syncGraphToGraph(graphBeta, graphAlpha);

    const alphaNodes = graphAlpha.query({ prefix: 'data/' });
    const betaNodes = graphBeta.query({ prefix: 'data/' });

    expect(alphaNodes).toHaveLength(4);
    expect(betaNodes).toHaveLength(4);
  });

  it('handles deletion during offline period', () => {
    graphAlpha.put('temp/item', { value: 'temporary' });
    syncGraphToGraph(graphAlpha, graphBeta);

    graphAlpha.delete('temp/item');

    syncGraphToGraph(graphAlpha, graphBeta);

    expect(graphAlpha.get('temp/item')).toBeUndefined();
    expect(graphBeta.get('temp/item')).toBeUndefined();
  });
});

function expectBothGraphsHaveNode(
  graphA: PulseGraph,
  graphB: PulseGraph,
  soul: string,
): void {
  expect(graphA.get(soul)).toBeDefined();
  expect(graphB.get(soul)).toBeDefined();
}
