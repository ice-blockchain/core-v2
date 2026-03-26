import { describe, it, expect } from 'vitest';
import { createPulseNode, isPulseLink, flattenNestedProperties } from './pulse-node.js';

describe('isPulseLink', () => {
  it('identifies a valid pulse link', () => {
    expect(isPulseLink({ '#': 'users/alice' })).toBe(true);
  });

  it('rejects null', () => {
    expect(isPulseLink(null)).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isPulseLink('hello')).toBe(false);
    expect(isPulseLink(42)).toBe(false);
    expect(isPulseLink(true)).toBe(false);
  });

  it('rejects objects without hash key', () => {
    expect(isPulseLink({ name: 'alice' })).toBe(false);
  });

  it('rejects objects with non-string hash value', () => {
    expect(isPulseLink({ '#': 123 })).toBe(false);
  });
});

describe('createPulseNode', () => {
  it('creates a node with meta timestamps', () => {
    const before = Date.now();
    const node = createPulseNode('users/alice', { name: 'Alice', age: 30 });
    const after = Date.now();

    expect(node.soul).toBe('users/alice');
    expect(node.properties.name).toBe('Alice');
    expect(node.properties.age).toBe(30);
    expect(node.meta.createdAt).toBeGreaterThanOrEqual(before);
    expect(node.meta.createdAt).toBeLessThanOrEqual(after);
    expect(node.meta.updatedAt).toBe(node.meta.createdAt);
  });

  it('converts nested objects into pulse links', () => {
    const node = createPulseNode('users/alice', {
      name: 'Alice',
      profile: { bio: 'Hello' },
    });

    expect(isPulseLink(node.properties.profile)).toBe(true);
    expect((node.properties.profile as { '#': string })['#']).toBe('users/alice/profile');
  });

  it('preserves existing pulse links', () => {
    const node = createPulseNode('posts/1', {
      title: 'Post',
      author: { '#': 'users/alice' },
    });

    expect(isPulseLink(node.properties.author)).toBe(true);
    expect((node.properties.author as { '#': string })['#']).toBe('users/alice');
  });

  it('handles null values as primitives', () => {
    const node = createPulseNode('items/1', { value: null });
    expect(node.properties.value).toBeNull();
  });
});

describe('flattenNestedProperties', () => {
  it('returns single node for flat data', () => {
    const nodes = flattenNestedProperties('users/alice', { name: 'Alice' });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.soul).toBe('users/alice');
    expect(nodes[0]!.properties.name).toBe('Alice');
  });

  it('denormalizes nested objects into multiple nodes', () => {
    const nodes = flattenNestedProperties('users/alice', {
      name: 'Alice',
      profile: { bio: 'Hello', avatar: 'pic.jpg' },
    });

    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.soul).toBe('users/alice');
    expect(nodes[1]!.soul).toBe('users/alice/profile');
    expect(nodes[1]!.properties.bio).toBe('Hello');
    expect(nodes[1]!.properties.avatar).toBe('pic.jpg');
  });

  it('handles deeply nested structures', () => {
    const nodes = flattenNestedProperties('root', {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    });

    expect(nodes).toHaveLength(3);
    expect(nodes[0]!.soul).toBe('root');
    expect(nodes[1]!.soul).toBe('root/level1');
    expect(nodes[2]!.soul).toBe('root/level1/level2');
    expect(nodes[2]!.properties.value).toBe('deep');
  });
});
