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
    head: vi.fn(),
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
      headers: { Authorization: 'Bearer current-tok', 'X-Username': 'alice' },
    });
    expect(result).toEqual({ token: 'new-tok' });
  });

  it('sends PUT to logout endpoint with X-Username header only', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.put).mockResolvedValueOnce({ status: 204, headers: {}, body: undefined });
    const ds = createSessionDataSource(httpClient);

    await ds.logout('alice');

    expect(httpClient.put).toHaveBeenCalledWith('/auth/logout', {
      headers: { 'X-Username': 'alice' },
    });
    const callHeaders = vi.mocked(httpClient.put).mock.calls[0]![1]!.headers as Record<string, string>;
    expect(callHeaders).not.toHaveProperty('Authorization');
  });
});
