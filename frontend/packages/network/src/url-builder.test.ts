import { describe, it, expect } from 'vitest';
import { interpolatePathParams } from './url-builder';

describe('interpolatePathParams basic', () => {
  it('returns path unchanged when no params', () => {
    expect(interpolatePathParams('/users')).toBe('/users');
  });

  it('interpolates path params', () => {
    const result = interpolatePathParams('/users/:id', { id: '123' });
    expect(result).toBe('/users/123');
  });

  it('encodes path params with special characters', () => {
    const result = interpolatePathParams('/users/:id', { id: '../admin' });
    expect(result).toContain('..%2Fadmin');
    expect(result).not.toContain('/../');
  });
});

describe('interpolatePathParams security', () => {
  it('rejects protocol-relative paths', () => {
    expect(() => interpolatePathParams('//evil.com/steal')).toThrow(
      'Protocol-relative path not allowed',
    );
  });
});
