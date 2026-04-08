import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';

import { createWalletsDataSource } from './wallets-data-source';

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

function mockGetResponse(httpClient: HttpClient, body: unknown): void {
  vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body });
}

function mockPostResponse(httpClient: HttpClient, body: unknown): void {
  vi.mocked(httpClient.post).mockResolvedValueOnce({ status: 200, headers: {}, body });
}

describe('createWalletsDataSource', () => {
  describe('listWallets', () => {
    it('fetches wallets list with X-Username header', async () => {
      const httpClient = createMockHttpClient();
      const response = { items: [{ id: 'w1', network: 'eth' }] };
      mockGetResponse(httpClient, response);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.listWallets('alice');

      expect(httpClient.get).toHaveBeenCalledWith('/wallets', {
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(response);
    });
  });

  describe('getWalletAssets', () => {
    it('fetches assets for a wallet with encoded walletId', async () => {
      const httpClient = createMockHttpClient();
      const response = { walletId: 'w1', network: 'eth', assets: [] };
      mockGetResponse(httpClient, response);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.getWalletAssets('w/1', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent('w/1')}/assets`,
        { headers: { 'X-Username': 'alice' } },
      );
      expect(result).toEqual(response);
    });
  });

  describe('getWalletNfts', () => {
    it('fetches NFTs for a wallet', async () => {
      const httpClient = createMockHttpClient();
      const response = { walletId: 'w1', network: 'eth', nfts: [] };
      mockGetResponse(httpClient, response);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.getWalletNfts('w1', 'bob');

      expect(httpClient.get).toHaveBeenCalledWith('/wallets/w1/nfts', {
        headers: { 'X-Username': 'bob' },
      });
      expect(result).toEqual(response);
    });
  });

  describe('probeRestrictedRegion', () => {
    it('posts to restricted region probe endpoint with username', async () => {
      const httpClient = createMockHttpClient();
      mockPostResponse(httpClient, { restricted: true });

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.probeRestrictedRegion('alice');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/wallets/wa-bogus-restricted-region-probe/transactions',
        { body: {}, headers: { 'X-Username': 'alice' } },
      );
      expect(result).toEqual({ restricted: true });
    });
  });

  describe('getWalletHistory', () => {
    it('fetches history without pagination params', async () => {
      const httpClient = createMockHttpClient();
      const response = { items: [], nextPageToken: null };
      mockGetResponse(httpClient, response);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.getWalletHistory('w1', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/wallets/w1/history', {
        query: {},
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(response);
    });

    it('includes pagination query params when provided', async () => {
      const httpClient = createMockHttpClient();
      mockGetResponse(httpClient, { items: [], nextPageToken: 'tok2' });

      const ds = createWalletsDataSource(httpClient);
      await ds.getWalletHistory('w1', 'alice', { limit: 10, paginationToken: 'tok1' });

      expect(httpClient.get).toHaveBeenCalledWith('/wallets/w1/history', {
        query: { limit: '10', paginationToken: 'tok1' },
        headers: { 'X-Username': 'alice' },
      });
    });
  });

  describe('getWalletTransfers', () => {
    it('fetches transfers with pagination params', async () => {
      const httpClient = createMockHttpClient();
      const response = { walletId: 'w1', items: [], nextPageToken: null };
      mockGetResponse(httpClient, response);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.getWalletTransfers('w1', 'alice', { limit: 5 });

      expect(httpClient.get).toHaveBeenCalledWith('/wallets/w1/transfers', {
        query: { limit: '5' },
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual(response);
    });
  });

  describe('getTransferById', () => {
    it('fetches a single transfer with encoded path segments', async () => {
      const httpClient = createMockHttpClient();
      const transfer = { id: 't1', walletId: 'w1', status: 'Confirmed' };
      mockGetResponse(httpClient, transfer);

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.getTransferById('w/1', 't/1', 'alice');

      expect(httpClient.get).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent('w/1')}/transfers/${encodeURIComponent('t/1')}`,
        { headers: { 'X-Username': 'alice' } },
      );
      expect(result).toEqual(transfer);
    });
  });

  describe('callFunction', () => {
    it('posts call-function request with network in path', async () => {
      const httpClient = createMockHttpClient();
      mockPostResponse(httpClient, { result: '0x123' });

      const request = {
        contract: '0xabc',
        abi: { type: 'function' as const, name: 'balanceOf', stateMutability: 'view', inputs: [], outputs: [] },
        calldata: { owner: '0xdef' },
      };

      const ds = createWalletsDataSource(httpClient);
      const result = await ds.callFunction('ethereum', request, 'alice');

      expect(httpClient.post).toHaveBeenCalledWith('/networks/ethereum/call-function', {
        body: request,
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual({ result: '0x123' });
    });
  });
});
