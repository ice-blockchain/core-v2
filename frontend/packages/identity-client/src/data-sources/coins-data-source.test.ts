import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';

import { createCoinsDataSource } from './coins-data-source';

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

const mockCoin = { id: 'c1', name: 'Bitcoin', symbol: 'BTC', symbolGroup: 'BTC' };

describe('createCoinsDataSource', () => {
  describe('getCoins', () => {
    it('fetches coins for a user with version query and username header', async () => {
      const httpClient = createMockHttpClient();
      const response = { coins: [mockCoin], networks: [], version: 2 };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: response });
      const ds = createCoinsDataSource(httpClient);

      const result = await ds.getCoins('user-1', 2, 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/v1/users/user-1/coins', {
        query: { version: '2' },
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(response);
    });

    it('encodes path-traversal characters in userId', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: {} });
      const ds = createCoinsDataSource(httpClient);

      await ds.getCoins('../admin', 1, 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/v1/users/..%2Fadmin/coins', expect.any(Object));
    });
  });

  describe('syncCoins', () => {
    it('patches with repeated symbolGroup query params', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.patch).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockCoin] });
      const ds = createCoinsDataSource(httpClient);

      const result = await ds.syncCoins(['BTC', 'ETH'], 'alice');

      expect(httpClient.patch).toHaveBeenCalledWith(
        '/v1/sync-coins?symbolGroup=BTC&symbolGroup=ETH',
        { headers: { 'X-Username': 'alice' } },
      );
      expect(result).toEqual([mockCoin]);
    });

    it('encodes special characters in symbolGroup values', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.patch).mockResolvedValueOnce({ status: 200, headers: {}, body: [] });
      const ds = createCoinsDataSource(httpClient);

      await ds.syncCoins(['A&B'], 'alice');

      expect(httpClient.patch).toHaveBeenCalledWith(
        '/v1/sync-coins?symbolGroup=A%26B',
        expect.any(Object),
      );
    });
  });

  describe('getCoinsBySymbolGroup', () => {
    it('fetches coins by symbol group with username header', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockCoin] });
      const ds = createCoinsDataSource(httpClient);

      const result = await ds.getCoinsBySymbolGroup('user-1', 'BTC', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/v1/users/user-1/coins/BTC', {
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual([mockCoin]);
    });

    it('encodes path segments in userId and symbolGroup', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [] });
      const ds = createCoinsDataSource(httpClient);

      await ds.getCoinsBySymbolGroup('u/1', 'S/G', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/v1/users/u%2F1/coins/S%2FG', expect.any(Object));
    });
  });

  describe('getCoinData', () => {
    it('posts contract address and network with username header', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body: mockCoin });
      const ds = createCoinsDataSource(httpClient);

      const result = await ds.getCoinData('0xabc', 'ethereum', 'alice');

      expect(httpClient.post).toHaveBeenCalledWith('/v1/coins', {
        body: { contractAddress: '0xabc', network: 'ethereum' },
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(mockCoin);
    });
  });

  describe('searchCoins', () => {
    it('searches coins with keyword on v2 endpoint', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockCoin] });
      const ds = createCoinsDataSource(httpClient);

      const result = await ds.searchCoins('bit', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/v2/coins', {
        query: { keyword: 'bit' },
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual([mockCoin]);
    });

    it('includes optional limit and offset in query', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [] });
      const ds = createCoinsDataSource(httpClient);

      await ds.searchCoins('eth', 'alice', { limit: 10, offset: 20 });

      expect(httpClient.get).toHaveBeenCalledWith('/v2/coins', {
        query: { keyword: 'eth', limit: '10', offset: '20' },
        headers: { 'X-Username': 'alice' },
      });
    });
  });
});
