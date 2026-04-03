import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import type { ISecureStorage } from '@ion/storage';
import { createIdentityClient } from './create-identity-client';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    head: vi.fn(),
  };
}

function createMockSecureStorage(): ISecureStorage {
  return {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    hasItem: vi.fn(() => Promise.resolve(false)),
    clear: vi.fn(() => Promise.resolve()),
  };
}

describe('createIdentityClient', () => {
  it('returns an object with all required methods', () => {
    const client = createIdentityClient({
      httpClient: createMockHttpClient(),
      secureStorage: createMockSecureStorage(),
      appId: 'com.example.app',
    });

    expect(client.registerWithPasskey).toBeTypeOf('function');
    expect(client.registerWithPassword).toBeTypeOf('function');
    expect(client.loginWithPasskey).toBeTypeOf('function');
    expect(client.loginWithPassword).toBeTypeOf('function');
    expect(client.logout).toBeTypeOf('function');
    expect(client.refreshToken).toBeTypeOf('function');
    expect(client.isAuthenticated).toBeTypeOf('function');
    expect(client.getLoginCapabilities).toBeTypeOf('function');
  });
});
