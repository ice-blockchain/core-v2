import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createLoginDataSource } from './login-data-source';

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

const validActionChallenge = {
  challenge: 'abc123',
  challengeIdentifier: 'ci-1',
  rp: { id: 'example.com', name: 'Example' },
  allowCredentials: { webauthn: [], passwordProtectedKey: [] },
  supportedCredentialKinds: [],
  attestation: 'direct',
  userVerification: 'preferred',
  externalAuthenticationUrl: '',
};

describe('createLoginDataSource', () => {
  it('posts username and empty 2FA codes to login init endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: validActionChallenge });
    const ds = createLoginDataSource(httpClient);

    await ds.initLogin('alice');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login/init', {
      body: { username: 'alice', '2FAVerificationCodes': {} },
    });
  });

  it('posts 2FA verification codes when provided', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: validActionChallenge });
    const ds = createLoginDataSource(httpClient);

    await ds.initLogin('alice', { email: '123456' });

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login/init', {
      body: { username: 'alice', '2FAVerificationCodes': { email: '123456' } },
    });
  });

  it('posts login payload to login endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: { token: 't', refreshToken: 'r' } });
    const ds = createLoginDataSource(httpClient);
    const payload = {
      challengeIdentifier: 'ci',
      firstFactor: {
        kind: 'Fido2' as const,
        credentialAssertion: { credId: 'id' },
      },
    };

    await ds.completeLogin(payload);

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', {
      body: payload,
    });
  });

  it('rejects malformed login challenge from server', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: { bad: 'data' } });
    const ds = createLoginDataSource(httpClient);

    await expect(ds.initLogin('alice')).rejects.toThrow('missing or empty challenge');
  });
});
