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
  it('posts refresh token with current token as auth header', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce({ token: 'new-tok' });
    const ds = createSessionDataSource(httpClient);

    const result = await ds.refreshToken('current-tok', 'refresh-tok');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login/delegated', {
      body: { refreshToken: 'refresh-tok' },
      headers: { Authorization: 'Bearer current-tok' },
    });
    expect(result).toEqual({ token: 'new-tok' });
  });

  it('posts to logout endpoint with auth header', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.post).mockResolvedValueOnce(undefined);
    const ds = createSessionDataSource(httpClient);

    await ds.logout('my-token');

    expect(httpClient.post).toHaveBeenCalledWith('/auth/logout', {
      headers: { Authorization: 'Bearer my-token' },
    });
  });
});
