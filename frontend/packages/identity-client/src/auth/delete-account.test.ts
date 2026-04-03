import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { IdentityErrorCode } from '../errors';
import { deleteAccount } from './delete-account';

// Build a mock JWT with userId in the payload
function buildMockJwt(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ 'https://custom/app_metadata': { userId } }));
  return `${header}.${payload}.sig`;
}

function createMockDeps(jwt?: string) {
  return {
    tokenManager: {
      getTokens: vi.fn(() => Promise.resolve({ token: jwt ?? buildMockJwt('user-123'), refreshToken: 'ref' })),
      setTokens: vi.fn(),
      clearTokens: vi.fn(() => Promise.resolve()),
      isTokenExpired: vi.fn(),
      getTrackedUsers: vi.fn(() => Promise.resolve([])),
    },
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {}, addUser: vi.fn(), removeUser: vi.fn() },
    httpClient: {
      get: vi.fn(),
    head: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
      upload: vi.fn(),
    } as unknown as HttpClient,
  };
}

describe('deleteAccount', () => {
  it('extracts userId from JWT and sends DELETE with userAction header', async () => {
    const deps = createMockDeps();
    await deleteAccount('alice', 'pre-signed-event', deps);
    expect(deps.httpClient.delete).toHaveBeenCalledWith('/auth/users/user-123', {
      headers: {
        'X-Username': 'alice',
        'X-Useraction': 'pre-signed-event',
      },
    });
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
    expect(deps.authStore.removeUser).toHaveBeenCalledWith('alice');
  });

  it('throws UNAUTHENTICATED when no tokens', async () => {
    const deps = createMockDeps();
    (deps.tokenManager as unknown as Record<string, unknown>).getTokens = vi.fn(() => Promise.resolve(null));
    await expect(
      deleteAccount('alice', 'event', deps),
    ).rejects.toMatchObject({ code: IdentityErrorCode.UNAUTHENTICATED });
  });

  it('throws on invalid JWT format', async () => {
    const deps = createMockDeps('not-a-jwt');
    await expect(
      deleteAccount('alice', 'event', deps),
    ).rejects.toMatchObject({ code: IdentityErrorCode.UNKNOWN });
  });
});
