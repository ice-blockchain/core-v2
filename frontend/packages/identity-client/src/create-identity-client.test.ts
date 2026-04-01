import { describe, it, expect, vi } from 'vitest';
import type { ISecureStorage } from '@ion/storage';
import { createIdentityClient } from './create-identity-client';

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
  it('returns an object with all required methods and authStore', () => {
    const client = createIdentityClient({
      secureStorage: createMockSecureStorage(),
      baseUrl: 'https://api.example.com',
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
    expect(client.getUser).toBeTypeOf('function');
    expect(client.verifyEarlyAccessEmail).toBeTypeOf('function');
    expect(client.listCredentials).toBeTypeOf('function');
    expect(client.createRecoveryCredentials).toBeTypeOf('function');
    expect(client.requestTwoFACode).toBeTypeOf('function');
    expect(client.verifyTwoFACode).toBeTypeOf('function');
    expect(client.deleteTwoFAMethod).toBeTypeOf('function');
    expect(client.deleteAccount).toBeTypeOf('function');
    expect(client.recoverAccount).toBeTypeOf('function');
    expect(client.restoreAuth).toBeTypeOf('function');
    expect(client.authStore).toBeDefined();
    expect(client.authStore.getSnapshot).toBeTypeOf('function');
    expect(client.authStore.subscribe).toBeTypeOf('function');
  });
});
