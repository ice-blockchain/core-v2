import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ISecureStorage } from '@ion/storage';
import { createTokenManager } from './token-manager';

function createJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.sig`;
}

function createMockStorage(): ISecureStorage {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    hasItem: vi.fn((key: string) => Promise.resolve(store.has(key))),
    clear: vi.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
  };
}

describe('TokenManager', () => {
  let storage: ISecureStorage;
  let manager: ReturnType<typeof createTokenManager>;

  beforeEach(() => {
    storage = createMockStorage();
    manager = createTokenManager(storage);
  });

  it('stores and retrieves tokens', async () => {
    await manager.setTokens('alice', { token: 'access-1', refreshToken: 'refresh-1' });
    const tokens = await manager.getTokens('alice');
    expect(tokens).toEqual({ token: 'access-1', refreshToken: 'refresh-1' });
  });

  it('returns null when no tokens stored', async () => {
    expect(await manager.getTokens('bob')).toBeNull();
  });

  it('clears tokens', async () => {
    await manager.setTokens('alice', { token: 'a', refreshToken: 'r' });
    await manager.clearTokens('alice');
    expect(await manager.getTokens('alice')).toBeNull();
  });

  it('reports expired token', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    await manager.setTokens('alice', { token: createJwt(pastExp), refreshToken: 'r' });
    expect(await manager.isTokenExpired('alice')).toBe(true);
  });

  it('reports valid token as not expired', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    await manager.setTokens('alice', { token: createJwt(futureExp), refreshToken: 'r' });
    expect(await manager.isTokenExpired('alice')).toBe(false);
  });

  it('reports expired when no token exists', async () => {
    expect(await manager.isTokenExpired('nobody')).toBe(true);
  });
});
