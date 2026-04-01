import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@ion/network';

import { createUserActionDataSource } from './user-action-data-source';

function createMockHttpClient(response: unknown): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: response })),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient;
}

function validChallenge() {
  return {
    challenge: 'ch',
    challengeIdentifier: 'ci',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: { webauthn: null, passwordProtectedKey: null },
    supportedCredentialKinds: [],
    attestation: 'direct',
    userVerification: 'preferred',
    externalAuthenticationUrl: '',
  };
}

describe('createUserActionDataSource', () => {
  it('initAction sends correct request and validates response', async () => {
    const httpClient = createMockHttpClient(validChallenge());
    const ds = createUserActionDataSource(httpClient);
    const input = {
      userActionPayload: '{}',
      userActionHttpMethod: 'POST',
      userActionHttpPath: '/auth/credentials',
      userActionServerKind: 'Api',
    };
    const result = await ds.initAction(input, 'alice');
    expect(result.challenge).toBe('ch');
    expect(httpClient.post).toHaveBeenCalledWith('/auth/action/init', {
      body: input,
      headers: { 'X-Username': 'alice' },
    });
  });

  it('completeAction sends correct request and validates response', async () => {
    const httpClient = createMockHttpClient({ userAction: 'signed-token' });
    const ds = createUserActionDataSource(httpClient);
    const input = {
      challengeIdentifier: 'ci',
      firstFactor: {
        kind: 'PasswordProtectedKey' as const,
        credentialAssertion: { clientData: 'cd', credId: 'cid', signature: 'sig' },
      },
    };
    const result = await ds.completeAction(input, 'alice');
    expect(result.userAction).toBe('signed-token');
    expect(httpClient.post).toHaveBeenCalledWith('/auth/action', {
      body: input,
      headers: { 'X-Username': 'alice' },
    });
  });

  it('initAction throws on malformed response', async () => {
    const httpClient = createMockHttpClient({ bad: 'response' });
    const ds = createUserActionDataSource(httpClient);
    await expect(
      ds.initAction(
        {
          userActionPayload: '{}',
          userActionHttpMethod: 'POST',
          userActionHttpPath: '/',
          userActionServerKind: 'Api',
        },
        'alice',
      ),
    ).rejects.toThrow();
  });

  it('completeAction throws on malformed response', async () => {
    const httpClient = createMockHttpClient({ bad: 'response' });
    const ds = createUserActionDataSource(httpClient);
    await expect(
      ds.completeAction(
        {
          challengeIdentifier: 'ci',
          firstFactor: {
            kind: 'PasswordProtectedKey',
            credentialAssertion: { clientData: 'cd', credId: 'cid', signature: 'sig' },
          },
        },
        'alice',
      ),
    ).rejects.toThrow();
  });
});
