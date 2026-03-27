import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createRegistrationDataSource } from './registration-data-source';

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

const validRegChallenge = {
  challenge: 'abc123',
  rp: { id: 'example.com', name: 'Example' },
  user: { id: 'u1', name: 'alice', displayName: 'Alice' },
  temporaryAuthenticationToken: 'tok',
  attestation: 'direct',
  pubKeyCredParams: [],
  excludeCredentials: [],
  authenticatorSelection: null,
  supportedCredentialKinds: null,
  allowedRecoveryCredentials: null,
};

const validRegResult = {
  authentication: { token: 't', refreshToken: 'r' },
  user: { id: 'u1' },
};

describe('createRegistrationDataSource', () => {
  it('posts email to delegated registration endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce(validRegChallenge);
    const ds = createRegistrationDataSource(httpClient);

    await ds.initRegistration('alice@example.com');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/delegated', {
      body: { email: 'alice@example.com' },
    });
  });

  it('includes earlyAccessEmail in registration init when provided', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce(validRegChallenge);
    const ds = createRegistrationDataSource(httpClient);

    await ds.initRegistration('alice@example.com', 'early@example.com');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/delegated', {
      body: { email: 'alice@example.com', earlyAccessEmail: 'early@example.com' },
    });
  });

  it('posts credential to enduser registration endpoint with temp token', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce(validRegResult);
    const ds = createRegistrationDataSource(httpClient);
    const credential = {
      firstFactorCredential: {
        credentialKind: 'Fido2' as const,
        credentialInfo: { credId: 'id' },
      },
    };

    await ds.completeRegistration(credential, 'temp-token');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/enduser', {
      body: credential,
      headers: { Authorization: 'Bearer temp-token' },
    });
  });

  it('includes earlyAccessEmail in registration complete when provided', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce(validRegResult);
    const ds = createRegistrationDataSource(httpClient);
    const credential = {
      firstFactorCredential: {
        credentialKind: 'Fido2' as const,
        credentialInfo: { credId: 'id' },
      },
    };

    await ds.completeRegistration(credential, 'temp-token', 'early@example.com');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/enduser', {
      body: { ...credential, earlyAccessEmail: 'early@example.com' },
      headers: { Authorization: 'Bearer temp-token' },
    });
  });

  it('rejects malformed registration challenge from server', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ bad: 'data' });
    const ds = createRegistrationDataSource(httpClient);

    await expect(ds.initRegistration('alice@example.com')).rejects.toThrow('missing or empty challenge');
  });
});
