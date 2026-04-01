import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createUserDataSource } from './user-data-source';

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

describe('createUserDataSource', () => {
  it('fetches user by ID with auth header', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: { masterPubKey: 'pk' } });
    const ds = createUserDataSource(httpClient);

    const result = await ds.getUser('user-123', 'alice');

    expect(httpClient.get).toHaveBeenCalledWith('/auth/users/user-123', {
      headers: { 'X-Username': 'alice' },
    });
    expect(result).toEqual({ masterPubKey: 'pk' });
  });

  it('encodes path-traversal characters in user ID', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: { masterPubKey: 'pk' } });
    const ds = createUserDataSource(httpClient);

    await ds.getUser('../admin', 'alice');

    expect(httpClient.get).toHaveBeenCalledWith('/auth/users/..%2Fadmin', {
      headers: { 'X-Username': 'alice' },
    });
  });

  it('fetches user by master key', async () => {
    const httpClient = createMockHttpClient();
    vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: { masterPubKey: 'pk' } });
    const ds = createUserDataSource(httpClient);

    await ds.getUser('npub1abc', 'alice');

    expect(httpClient.get).toHaveBeenCalledWith('/auth/users/npub1abc', {
      headers: { 'X-Username': 'alice' },
    });
  });
});
