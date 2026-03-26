import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { createPulseGraph } from './pulse-graph';

describe('createPulseGraph', () => {
  it('creates a graph with a Y.Doc', () => {
    const graph = createPulseGraph();
    expect(graph.doc).toBeInstanceOf(Y.Doc);
  });

  it('accepts an existing Y.Doc', () => {
    const doc = new Y.Doc();
    const graph = createPulseGraph(doc);
    expect(graph.doc).toBe(doc);
  });
});

describe('pulsePut', () => {
  it('creates a node and retrieves it by soul', () => {
    const graph = createPulseGraph();
    graph.pulsePut('user-1', { name: 'Alice', age: 30 });

    const node = graph.pulseGet('user-1');
    expect(node).not.toBeNull();
    expect(node?.properties.name).toBe('Alice');
    expect(node?.properties.age).toBe(30);
  });

  it('updates existing node properties', () => {
    const graph = createPulseGraph();
    graph.pulsePut('user-1', { name: 'Alice' });
    graph.pulsePut('user-1', { name: 'Bob' });

    const node = graph.pulseGet('user-1');
    expect(node?.properties.name).toBe('Bob');
  });

  it('auto-denormalizes nested objects into child nodes', () => {
    const graph = createPulseGraph();
    graph.pulsePut('post-1', {
      title: 'Hello',
      author: { name: 'Alice' },
    });

    const post = graph.pulseGet('post-1');
    expect(post?.properties.author).toEqual({ '#': 'post-1/author' });

    const author = graph.pulseGet('post-1/author');
    expect(author?.properties.name).toBe('Alice');
  });

  it('returns all created nodes including denormalized children', () => {
    const graph = createPulseGraph();
    const nodes = graph.pulsePut('post-1', {
      title: 'Hello',
      author: { name: 'Alice' },
    });

    expect(nodes).toHaveLength(2);
  });

  it('preserves explicit PulseLink without denormalization', () => {
    const graph = createPulseGraph();
    graph.pulsePut('post-1', {
      title: 'Hello',
      author: { '#': 'user-alice' },
    });

    const post = graph.pulseGet('post-1');
    expect(post?.properties.author).toEqual({ '#': 'user-alice' });
    expect(graph.pulseGet('user-alice')).toBeNull();
  });
});

describe('pulseGet', () => {
  it('returns null for non-existent soul', () => {
    const graph = createPulseGraph();
    expect(graph.pulseGet('non-existent')).toBeNull();
  });

  it('returns node with correct metadata', () => {
    const graph = createPulseGraph();
    graph.pulsePut('user-1', { name: 'Alice' });

    const node = graph.pulseGet('user-1');
    expect(node?.meta.soul).toBe('user-1');
    expect(node?.meta.isDeleted).toBe(false);
    expect(node?.meta.createdAt).toBeGreaterThan(0);
  });
});

describe('pulseDelete', () => {
  it('marks a node as deleted', () => {
    const graph = createPulseGraph();
    graph.pulsePut('user-1', { name: 'Alice' });
    const deleted = graph.pulseDelete('user-1');

    expect(deleted).toBe(true);
    const node = graph.pulseGet('user-1');
    expect(node?.meta.isDeleted).toBe(true);
  });

  it('returns false for non-existent soul', () => {
    const graph = createPulseGraph();
    expect(graph.pulseDelete('ghost')).toBe(false);
  });
});

describe('pulseQuery', () => {
  it('returns nodes matching a soul prefix', () => {
    const graph = createPulseGraph();
    graph.pulsePut('users/alice', { name: 'Alice' });
    graph.pulsePut('users/bob', { name: 'Bob' });
    graph.pulsePut('posts/1', { title: 'Hello' });

    const result = graph.pulseQuery({ prefix: 'users/' });
    expect(result.nodes).toHaveLength(2);
    expect(result.hasMore).toBe(false);
  });

  it('respects limit and reports hasMore', () => {
    const graph = createPulseGraph();
    graph.pulsePut('item/1', { value: 1 });
    graph.pulsePut('item/2', { value: 2 });
    graph.pulsePut('item/3', { value: 3 });

    const result = graph.pulseQuery({ prefix: 'item/', limit: 2 });
    expect(result.nodes).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  it('excludes soft-deleted nodes from results', () => {
    const graph = createPulseGraph();
    graph.pulsePut('users/alice', { name: 'Alice' });
    graph.pulsePut('users/bob', { name: 'Bob' });
    graph.pulseDelete('users/alice');

    const result = graph.pulseQuery({ prefix: 'users/' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.soul).toBe('users/bob');
  });

  it('returns sorted results by soul', () => {
    const graph = createPulseGraph();
    graph.pulsePut('z-node', { value: 1 });
    graph.pulsePut('a-node', { value: 2 });
    graph.pulsePut('m-node', { value: 3 });

    const result = graph.pulseQuery({ prefix: '' });
    const souls = result.nodes.map((n) => n.soul);
    expect(souls).toEqual([...souls].sort());
  });
});

describe('Yjs sync between two graphs', () => {
  it('propagates data from one graph to another via Y.Doc sync', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const graph1 = createPulseGraph(doc1);
    const graph2 = createPulseGraph(doc2);

    graph1.pulsePut('user-1', { name: 'Alice' });

    const stateVector = Y.encodeStateVector(doc2);
    const update = Y.encodeStateAsUpdate(doc1, stateVector);
    Y.applyUpdate(doc2, update);

    const node = graph2.pulseGet('user-1');
    expect(node).not.toBeNull();
    expect(node?.properties.name).toBe('Alice');
  });
});
