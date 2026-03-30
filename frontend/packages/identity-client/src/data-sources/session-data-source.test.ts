import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createSessionDataSource } from './session-data-source';

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

describe('createSessionDataSource', () => {
  it('posts username and refresh token with current token as auth header', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: { token: 'new-tok' } });
    const ds = createSessionDataSource(httpClient);

    const result = await ds.refreshToken({
      username: 'alice',
      currentToken: 'current-tok',
      refreshToken: 'refresh-tok',
    });

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login/delegated', {
      body: { username: 'alice', refreshToken: 'refresh-tok' },
      headers: { Authorization: 'Bearer current-tok' },
    });
    expect(result).toEqual({ token: 'new-tok' });
  });

  it('sends PUT to logout endpoint with auth and username headers', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.put).mockResolvedValueOnce({ status: 204, headers: {}, body: undefined });
    const ds = createSessionDataSource(httpClient);

    await ds.logout('my-token', 'alice');

    expect(httpClient.put).toHaveBeenCalledWith('/auth/logout', {
      headers: { Authorization: 'Bearer my-token', 'X-Username': 'alice' },
    });
  });
});
