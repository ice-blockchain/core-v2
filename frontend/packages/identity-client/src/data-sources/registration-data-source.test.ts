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

describe('createRegistrationDataSource', () => {
  it('posts email to delegated registration endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ challenge: 'ch' });
    const ds = createRegistrationDataSource(httpClient);

    await ds.initRegistration('alice@example.com');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/delegated', {
      body: { email: 'alice@example.com' },
    });
  });

  it('includes earlyAccessEmail in registration init when provided', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ challenge: 'ch' });
    const ds = createRegistrationDataSource(httpClient);

    await ds.initRegistration('alice@example.com', 'early@example.com');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/registration/delegated', {
      body: { email: 'alice@example.com', earlyAccessEmail: 'early@example.com' },
    });
  });

  it('posts credential to enduser registration endpoint with temp token', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ authentication: {}, user: {} });
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
    vi.mocked(httpClient.post).mockResolvedValueOnce({ authentication: {}, user: {} });
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
});
