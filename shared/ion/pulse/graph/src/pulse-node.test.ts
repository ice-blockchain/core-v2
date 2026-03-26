import { describe, it, expect } from 'vitest';
import { createPulseNode, isPulseLink, extractLinks, validateSoul } from './pulse-node';

describe('createPulseNode', () => {
  it('creates a node with correct soul and auto-generated meta', () => {
    const node = createPulseNode('users/alice', { name: 'Alice', age: 30 });

    expect(node.soul).toBe('users/alice');
    expect(node.properties.name).toBe('Alice');
    expect(node.properties.age).toBe(30);
    expect(node.meta.soul).toBe('users/alice');
    expect(node.meta.created).toBeGreaterThan(0);
    expect(node.meta.updated).toBeGreaterThan(0);
  });
});

describe('isPulseLink', () => {
  it('returns true for valid pulse links', () => {
    expect(isPulseLink({ '#': 'users/bob' })).toBe(true);
  });

  it('returns false for non-link values', () => {
    expect(isPulseLink('hello')).toBe(false);
    expect(isPulseLink(42)).toBe(false);
    expect(isPulseLink(null)).toBe(false);
    expect(isPulseLink({ name: 'test' })).toBe(false);
  });
});

describe('extractLinks', () => {
  it('returns all links from node properties', () => {
    const node = createPulseNode('posts/1', {
      title: 'Hello',
      author: { '#': 'users/alice' },
      category: { '#': 'categories/tech' },
      rating: 5,
    });

    const links = extractLinks(node);
    expect(links).toHaveLength(2);
    expect(links[0]?.['#']).toBe('users/alice');
    expect(links[1]?.['#']).toBe('categories/tech');
  });

  it('returns empty array when no links exist', () => {
    const node = createPulseNode('users/alice', { name: 'Alice' });
    expect(extractLinks(node)).toHaveLength(0);
  });
});

describe('validateSoul', () => {
  it('accepts non-empty strings', () => {
    expect(validateSoul('users/alice')).toBe(true);
    expect(validateSoul('a')).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(validateSoul('')).toBe(false);
  });
});
