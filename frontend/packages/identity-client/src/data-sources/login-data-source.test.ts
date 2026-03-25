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

describe('createLoginDataSource', () => {
  it('posts username to login init endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ challenge: 'ch' });
    const ds = createLoginDataSource(httpClient);

    await ds.initLogin('alice');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login/init', {
      body: { username: 'alice' },
    });
  });

  it('posts login payload to login endpoint', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ token: 't', refreshToken: 'r' });
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
});
