import { describe, it, expect, vi } from 'vitest';
import { IdentityErrorCode } from '../errors';
import { deleteAccount } from './delete-account';

vi.mock('./execute-signed-request', () => ({
  executeSignedRequest: vi.fn(() => Promise.resolve()),
}));

import { executeSignedRequest } from './execute-signed-request';

// Build a mock JWT with userId in the payload
function buildMockJwt(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ 'https://custom/app_metadata': { userId } }));
  return `${header}.${payload}.sig`;
}

function createMockDeps(jwt?: string) {
  return {
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    tokenManager: {
      getTokens: vi.fn(() => Promise.resolve({ token: jwt ?? buildMockJwt('user-123'), refreshToken: 'ref' })),
      setTokens: vi.fn(),
      clearTokens: vi.fn(() => Promise.resolve()),
      isTokenExpired: vi.fn(),
      getTrackedUsers: vi.fn(() => Promise.resolve([])),
    },
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {}, addUser: vi.fn(), removeUser: vi.fn() },
    httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn() },
    origin: 'https://example.com',
  };
}

describe('deleteAccount', () => {
  it('extracts userId from JWT and executes signed DELETE', async () => {
    const deps = createMockDeps();
    await deleteAccount('alice', { kind: 'password', password: 'pass' }, deps);
    expect(executeSignedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'alice',
        httpMethod: 'DELETE',
        httpPath: '/auth/users/user-123',
      }),
      expect.objectContaining({
        userActionDataSource: deps.userActionDataSource,
        httpClient: deps.httpClient,
        origin: deps.origin,
      }),
    );
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });

  it('throws UNAUTHENTICATED when no tokens', async () => {
    const deps = createMockDeps();
    (deps.tokenManager as unknown as Record<string, unknown>).getTokens = vi.fn(() => Promise.resolve(null));
    await expect(
      deleteAccount('alice', { kind: 'password', password: 'pass' }, deps),
    ).rejects.toMatchObject({ code: IdentityErrorCode.UNAUTHENTICATED });
  });

  it('throws on invalid JWT format', async () => {
    const deps = createMockDeps('not-a-jwt');
    await expect(
      deleteAccount('alice', { kind: 'password', password: 'pass' }, deps),
    ).rejects.toMatchObject({ code: IdentityErrorCode.UNKNOWN });
  });
});
