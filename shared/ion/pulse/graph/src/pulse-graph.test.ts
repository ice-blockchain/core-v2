import { describe, it, expect } from 'vitest';
import { createPulseGraph } from './pulse-graph';

describe('createPulseGraph', () => {
  it('puts and gets a node round-trip', () => {
    const graph = createPulseGraph();

    graph.put('users/alice', { name: 'Alice', age: 30 });
    const node = graph.get('users/alice');

    expect(node).toBeDefined();
    expect(node?.soul).toBe('users/alice');
    expect(node?.properties.name).toBe('Alice');
    expect(node?.properties.age).toBe(30);
  });

  it('marks a node as deleted on soft delete', () => {
    const graph = createPulseGraph();

    graph.put('users/bob', { name: 'Bob' });
    graph.delete('users/bob');

    const node = graph.get('users/bob');
    expect(node).toBeUndefined();
  });

  it('queries nodes by prefix', () => {
    const graph = createPulseGraph();

    graph.put('users/alice', { name: 'Alice' });
    graph.put('users/bob', { name: 'Bob' });
    graph.put('posts/1', { title: 'Hello' });

    const users = graph.query({ prefix: 'users/' });
    expect(users).toHaveLength(2);

    const posts = graph.query({ prefix: 'posts/' });
    expect(posts).toHaveLength(1);
  });

  it('auto-denormalizes nested objects into separate nodes', () => {
    const graph = createPulseGraph();

    graph.put('posts/1', {
      title: 'Hello',
      author: { name: 'Alice', age: 30 } as unknown as Record<string, string>,
    } as Record<string, string>);

    const post = graph.get('posts/1');
    expect(post).toBeDefined();

    const authorLink = post?.properties.author;
    expect(authorLink).toBeDefined();
    expect(typeof authorLink === 'object' && authorLink !== null && '#' in authorLink).toBe(true);

    const author = graph.get('posts/1/author');
    expect(author).toBeDefined();
    expect(author?.properties.name).toBe('Alice');
    expect(author?.properties.age).toBe(30);
  });

  it('respects query limit', () => {
    const graph = createPulseGraph();

    graph.put('items/1', { value: 1 });
    graph.put('items/2', { value: 2 });
    graph.put('items/3', { value: 3 });

    const results = graph.query({ prefix: 'items/', limit: 2 });
    expect(results).toHaveLength(2);
  });
});
