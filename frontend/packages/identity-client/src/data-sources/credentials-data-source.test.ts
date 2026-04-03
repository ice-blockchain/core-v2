import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createCredentialsDataSource } from './credentials-data-source';

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

describe('createCredentialsDataSource', () => {
  it('lists credentials with auth headers', async () => {
    const httpClient = createMockHttpClient();
    const items = [{ uuid: 'u1', kind: 'Fido2', name: 'key-1' }];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: { items } });
    const ds = createCredentialsDataSource(httpClient);

    const result = await ds.listCredentials('alice');

    expect(httpClient.get).toHaveBeenCalledWith('/auth/credentials', {
      headers: { 'X-Username': 'alice' },
    });
    expect(result.items).toEqual(items);
  });

  it('inits credential creation with kind and auth headers', async () => {
    const httpClient = createMockHttpClient();
    const challenge = { challenge: 'ch', rp: { id: 'x', name: 'X' } };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: challenge });
    const ds = createCredentialsDataSource(httpClient);

    const result = await ds.initCreateCredential('RecoveryKey', 'alice');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/credentials/init', {
      body: { kind: 'RecoveryKey' },
      headers: { 'X-Username': 'alice' },
    });
    expect(result).toEqual(challenge);
  });

  it('creates credential with user action header', async () => {
    const httpClient = createMockHttpClient();
    const credResult = { credentialUuid: 'uuid', credentialId: 'cid', kind: 'RecoveryKey', name: 'k' };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: credResult });
    const ds = createCredentialsDataSource(httpClient);
    const payload = {
      challengeIdentifier: 'ch',
      credentialName: 'n',
      credentialKind: 'RecoveryKey',
      credentialInfo: { credId: 'c', clientData: 'cd', attestationData: 'ad' },
      encryptedPrivateKey: '{}',
    };

    const result = await ds.createCredential(payload, { username: 'alice', userAction: 'ua-token' });

    expect(httpClient.post).toHaveBeenCalledWith('/auth/credentials', {
      body: payload,
      headers: { 'X-Username': 'alice', 'X-Useraction': 'ua-token' },
    });
    expect(result).toEqual(credResult);
  });
});
