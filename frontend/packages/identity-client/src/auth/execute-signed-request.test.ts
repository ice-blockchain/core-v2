import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { executeSignedRequest } from './execute-signed-request';

vi.mock('./sign-user-action', () => ({
  signUserAction: vi.fn(() => Promise.resolve('ua-token')),
}));

function createMockDeps() {
  const httpClient = {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: { result: 'ok' } })),
    put: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: { result: 'ok' } })),
    patch: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: { result: 'ok' } })),
    delete: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
    upload: vi.fn(),
  } as unknown as HttpClient;
  return {
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() } as unknown as UserActionDataSource,
    httpClient,
    origin: 'https://example.com',
  };
}

describe('executeSignedRequest', () => {
  it('sends POST with X-Useraction header', async () => {
    const deps = createMockDeps();
    const result = await executeSignedRequest<{ result: string }>(
      {
        username: 'alice',
        httpMethod: 'POST',
        httpPath: '/auth/credentials',
        body: { key: 'value' },
        signingContext: { kind: 'password', password: 'pass' },
      },
      deps,
    );
    expect(result).toEqual({ result: 'ok' });
    expect(deps.httpClient.post).toHaveBeenCalledWith('/auth/credentials', {
      headers: {
        'X-Username': 'alice',
        'X-Useraction': 'ua-token',
      },
      body: { key: 'value' },
    });
  });

  it('sends DELETE with raw X-Useraction header', async () => {
    const deps = createMockDeps();
    await executeSignedRequest(
      {
        username: 'alice',
        httpMethod: 'DELETE',
        httpPath: '/auth/users/123',
        signingContext: { kind: 'password', password: 'pass' },
      },
      deps,
    );
    expect(deps.httpClient.delete).toHaveBeenCalledWith('/auth/users/123', {
      headers: expect.objectContaining({ 'X-Useraction': 'ua-token' }),
    });
  });
});
