import { describe, it, expect } from 'vitest';
import { createPulseGraph } from './pulse-graph.js';
import { isPulseLink } from './pulse-node.js';

describe('createPulseGraph', () => {
  it('stores and retrieves a simple node via pulsePut and pulseGet', () => {
    const graph = createPulseGraph();
    graph.pulsePut('users/alice', { name: 'Alice', age: 30 });

    const node = graph.pulseGet('users/alice');
    expect(node).not.toBeNull();
    expect(node!.soul).toBe('users/alice');
    expect(node!.properties.name).toBe('Alice');
    expect(node!.properties.age).toBe(30);
  });

  it('auto-denormalizes nested objects on pulsePut', () => {
    const graph = createPulseGraph();
    const nodes = graph.pulsePut('users/bob', {
      name: 'Bob',
      profile: { bio: 'Hi there' },
    });

    expect(nodes).toHaveLength(2);

    const parent = graph.pulseGet('users/bob');
    expect(parent).not.toBeNull();
    expect(isPulseLink(parent!.properties.profile)).toBe(true);

    const child = graph.pulseGet('users/bob/profile');
    expect(child).not.toBeNull();
    expect(child!.properties.bio).toBe('Hi there');
  });

  it('returns null for non-existent soul', () => {
    const graph = createPulseGraph();
    expect(graph.pulseGet('nonexistent/soul')).toBeNull();
  });

  it('tombstones a node on pulseDelete so pulseGet returns null', () => {
    const graph = createPulseGraph();
    graph.pulsePut('users/carol', { name: 'Carol' });

    const deleted = graph.pulseDelete('users/carol');
    expect(deleted).toBe(true);
    expect(graph.pulseGet('users/carol')).toBeNull();
  });

  it('returns false when deleting non-existent node', () => {
    const graph = createPulseGraph();
    expect(graph.pulseDelete('ghost')).toBe(false);
  });

  it('physically removes the node on pulseErase', () => {
    const graph = createPulseGraph();
    graph.pulsePut('users/dave', { name: 'Dave' });

    const erasure = graph.pulseErase('users/dave');
    expect(erasure.soul).toBe('users/dave');
    expect(erasure.erasedAt).toBeGreaterThan(0);
    expect(graph.pulseGet('users/dave')).toBeNull();
    expect(graph.getNodesMap().has('users/dave')).toBe(false);
  });

  it('returns nodes matching prefix via pulseQuery', () => {
    const graph = createPulseGraph();
    graph.pulsePut('posts/1', { title: 'First' });
    graph.pulsePut('posts/2', { title: 'Second' });
    graph.pulsePut('users/alice', { name: 'Alice' });

    const posts = graph.pulseQuery('posts/');
    expect(posts).toHaveLength(2);
    expect(posts.map((n) => n.soul).sort()).toEqual(['posts/1', 'posts/2']);
  });

  it('excludes deleted nodes from pulseQuery results', () => {
    const graph = createPulseGraph();
    graph.pulsePut('items/a', { value: 1 });
    graph.pulsePut('items/b', { value: 2 });
    graph.pulseDelete('items/a');

    const items = graph.pulseQuery('items/');
    expect(items).toHaveLength(1);
    expect(items[0]!.soul).toBe('items/b');
  });

  it('exposes underlying Y.Doc and Y.Map', () => {
    const graph = createPulseGraph();
    expect(graph.getDocument()).toBeDefined();
    expect(graph.getNodesMap()).toBeDefined();
  });
});
