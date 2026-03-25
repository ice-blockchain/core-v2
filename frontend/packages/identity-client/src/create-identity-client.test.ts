import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import type { ISecureStorage, IKeyValueStorage } from '@ion/storage';
import { createIdentityClient } from './create-identity-client';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
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

function createMockKeyValueStorage(): IKeyValueStorage {
  return {
    getString: vi.fn(() => null),
    setString: vi.fn(),
    getBoolean: vi.fn(() => null),
    setBoolean: vi.fn(),
    getNumber: vi.fn(() => null),
    setNumber: vi.fn(),
    getObject: vi.fn(() => null),
    setObject: vi.fn(),
    removeItem: vi.fn(),
    hasItem: vi.fn(() => false),
    clear: vi.fn(),
  };
}

describe('createIdentityClient', () => {
  it('returns an object with all required methods', () => {
    const client = createIdentityClient({
      httpClient: createMockHttpClient(),
      secureStorage: createMockSecureStorage(),
      keyValueStorage: createMockKeyValueStorage(),
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
