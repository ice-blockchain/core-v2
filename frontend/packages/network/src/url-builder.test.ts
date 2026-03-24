import { describe, it, expect } from 'vitest';
import { buildRequestUrl } from './url-builder';

describe('buildRequestUrl path joining', () => {
  it('joins base URL and path', () => {
    const url = buildRequestUrl({ baseUrl: 'https://api.example.com', path: '/users' });
    expect(url).toBe('https://api.example.com/users');
  });

  it('handles base URL with trailing slash', () => {
    const url = buildRequestUrl({ baseUrl: 'https://api.example.com/', path: '/users' });
    expect(url).toBe('https://api.example.com/users');
  });

  it('handles path without leading slash', () => {
    const url = buildRequestUrl({ baseUrl: 'https://api.example.com', path: 'users' });
    expect(url).toBe('https://api.example.com/users');
  });
});

describe('buildRequestUrl param interpolation', () => {
  it('interpolates path params', () => {
    const url = buildRequestUrl({
      baseUrl: 'https://api.example.com',
      path: '/users/:id',
      params: { id: '123' },
    });
    expect(url).toBe('https://api.example.com/users/123');
  });

  it('encodes path params with special characters', () => {
    const url = buildRequestUrl({
      baseUrl: 'https://api.example.com',
      path: '/users/:id',
      params: { id: '../admin' },
    });
    expect(url).toContain('..%2Fadmin');
    expect(url).not.toContain('/../');
  });
});

describe('buildRequestUrl query params', () => {
  it('appends query params', () => {
    const url = buildRequestUrl({
      baseUrl: 'https://api.example.com',
      path: '/users',
      query: { page: '1', limit: '10' },
    });
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
  });
});

describe('buildRequestUrl origin validation', () => {
  it('rejects URLs with mismatched origin', () => {
    expect(() => buildRequestUrl({
      baseUrl: 'https://api.example.com',
      path: '//evil.com/steal',
    })).toThrow('Protocol-relative path not allowed');
  });
});
