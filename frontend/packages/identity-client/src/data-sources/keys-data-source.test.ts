import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';

import { createKeysDataSource } from './keys-data-source';

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

const mockKeysResponse = {
  items: [{ id: 'k1', scheme: 'EdDSA', curve: 'ed25519', publicKey: 'pk1', name: null, status: 'Active', custodial: false, dateCreated: '2026-01-01' }],
  nextPageToken: null,
};

describe('createKeysDataSource', () => {
  describe('listKeys', () => {
    it('fetches keys with username header and no query params', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockKeysResponse });
      const ds = createKeysDataSource(httpClient);

      const result = await ds.listKeys('alice');

      expect(httpClient.get).toHaveBeenCalledWith('/keys', {
        query: {},
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(mockKeysResponse);
    });

    it('includes owner filter in query', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockKeysResponse });
      const ds = createKeysDataSource(httpClient);

      await ds.listKeys('alice', { owner: 'user-1' });

      expect(httpClient.get).toHaveBeenCalledWith('/keys', {
        query: { owner: 'user-1' },
        headers: { 'X-Username': 'alice' },
      });
    });

    it('includes limit and paginationToken in query', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockKeysResponse });
      const ds = createKeysDataSource(httpClient);

      await ds.listKeys('alice', { limit: 5, paginationToken: 'tok-abc' });

      expect(httpClient.get).toHaveBeenCalledWith('/keys', {
        query: { limit: '5', paginationToken: 'tok-abc' },
        headers: { 'X-Username': 'alice' },
      });
    });

    it('omits undefined optional params from query', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockKeysResponse });
      const ds = createKeysDataSource(httpClient);

      await ds.listKeys('alice', { owner: 'user-1' });

      expect(httpClient.get).toHaveBeenCalledWith('/keys', {
        query: { owner: 'user-1' },
        headers: { 'X-Username': 'alice' },
      });
    });
  });
});
