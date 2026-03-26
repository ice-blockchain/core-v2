import { describe, expect, it } from 'vitest';

import {
  createPulseNode,
  denormalizePulseInput,
  generateChildSoul,
  isPulseLink,
  isNestedObject,
} from './pulse-node';

describe('isPulseLink', () => {
  it('returns true for a valid link object', () => {
    expect(isPulseLink({ '#': 'some-soul' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPulseLink(null)).toBe(false);
  });

  it('returns false for a string primitive', () => {
    expect(isPulseLink('hello')).toBe(false);
  });

  it('returns false for an object without # key', () => {
    expect(isPulseLink({ name: 'alice' })).toBe(false);
  });
});

describe('isNestedObject', () => {
  it('returns true for a plain object without # key', () => {
    expect(isNestedObject({ name: 'alice' })).toBe(true);
  });

  it('returns false for a PulseLink', () => {
    expect(isNestedObject({ '#': 'soul-123' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNestedObject(null)).toBe(false);
  });
});

describe('generateChildSoul', () => {
  it('concatenates parent soul and key with slash', () => {
    expect(generateChildSoul('users/alice', 'profile')).toBe('users/alice/profile');
  });
});

describe('createPulseNode', () => {
  it('creates a node with correct soul and properties', () => {
    const node = createPulseNode('user-1', { name: 'Alice', age: 30 });
    expect(node.soul).toBe('user-1');
    expect(node.properties.name).toBe('Alice');
    expect(node.properties.age).toBe(30);
  });

  it('attaches metadata with timestamps', () => {
    const node = createPulseNode('user-1', {});
    expect(node.meta.soul).toBe('user-1');
    expect(node.meta.isDeleted).toBe(false);
    expect(node.meta.createdAt).toBeGreaterThan(0);
  });
});

describe('denormalizePulseInput', () => {
  it('returns a single node for flat input', () => {
    const { nodes } = denormalizePulseInput({
      soul: 'post-1',
      data: { title: 'Hello', likes: 5 },
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.soul).toBe('post-1');
    expect(nodes[0]?.properties.title).toBe('Hello');
  });

  it('denormalizes nested objects into separate nodes with links', () => {
    const { nodes } = denormalizePulseInput({
      soul: 'post-1',
      data: {
        title: 'Hello',
        author: { name: 'Alice', age: 30 },
      },
    });

    expect(nodes).toHaveLength(2);

    const parent = nodes.find((n) => n.soul === 'post-1');
    const child = nodes.find((n) => n.soul === 'post-1/author');

    expect(parent?.properties.author).toEqual({ '#': 'post-1/author' });
    expect(child?.properties.name).toBe('Alice');
    expect(child?.properties.age).toBe(30);
  });

  it('handles deeply nested objects', () => {
    const { nodes } = denormalizePulseInput({
      soul: 'root',
      data: {
        child: {
          grandchild: {
            value: 42,
          },
        },
      },
    });

    expect(nodes).toHaveLength(3);
    expect(nodes.find((n) => n.soul === 'root/child/grandchild')).toBeDefined();
  });

  it('preserves explicit PulseLink references', () => {
    const { nodes } = denormalizePulseInput({
      soul: 'post-1',
      data: {
        title: 'Hello',
        author: { '#': 'user-alice' },
      },
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.properties.author).toEqual({ '#': 'user-alice' });
  });
});
