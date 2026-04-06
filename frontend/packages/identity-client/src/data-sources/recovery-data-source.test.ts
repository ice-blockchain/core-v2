import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createRecoveryDataSource } from './recovery-data-source';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    head: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };
}

const validChallenge = {
  challenge: 'abc123',
  rp: { id: 'example.com', name: 'Example' },
  user: { id: 'u1', name: 'alice', displayName: 'Alice' },
  temporaryAuthenticationToken: 'temp-tok',
  attestation: 'direct',
  pubKeyCredParams: [],
  excludeCredentials: [],
  authenticatorSelection: null,
  supportedCredentialKinds: null,
  allowedRecoveryCredentials: [{ id: 'rec-1', encryptedRecoveryKey: '{}' }],
};

const validResult = {
  credential: { uuid: 'cr-1', kind: 'PasswordProtectedKey', name: 'Default Credential' },
  user: { id: 'u1' },
};

describe('createRecoveryDataSource', () => {
  it('posts recovery init to delegated endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      status: 200, headers: {}, body: validChallenge,
    });
    const ds = createRecoveryDataSource(httpClient);

    const result = await ds.initRecovery({
      username: 'alice',
      credentialId: 'rec-1',
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      '/auth/recover/user/delegated',
      { body: { username: 'alice', credentialId: 'rec-1' } },
    );
    expect(result).toEqual(validChallenge);
  });

  it('posts recovery completion with bearer token', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      status: 200, headers: {}, body: validResult,
    });
    const ds = createRecoveryDataSource(httpClient);
    const input = {
      newCredentials: {
        firstFactorCredential: {
          credentialKind: 'Fido2' as const,
          credentialInfo: { credId: 'id', clientData: 'cd', attestationData: 'ad' },
          encryptedPrivateKey: null,
        },
      },
      recovery: {
        kind: 'RecoveryKey' as const,
        credentialAssertion: { clientData: 'cd', credId: 'rid', signature: 'sig' },
      },
    };

    const result = await ds.completeRecovery(input, 'temp-tok');

    expect(httpClient.post).toHaveBeenCalledWith(
      '/auth/recover/user',
      { body: input, headers: { Authorization: 'Bearer temp-tok' } },
    );
    expect(result).toEqual(validResult);
  });
});
