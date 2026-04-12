import type { HttpClient } from '@ion/network';

import type {
  Wallet,
  WalletNft,
  WalletAsset,
  WalletHistoryItem,
  WalletTransferRequest,
  CallFunctionRequest,
  CallFunctionResponse,
} from '../wallets/types';

interface ListWalletsResponse { items: Wallet[] }
interface WalletAssetsResponse { walletId: string; network: string; assets: WalletAsset[] }
interface WalletNftsResponse { walletId: string; network: string; nfts: WalletNft[] }
export interface WalletHistoryResponse { items: WalletHistoryItem[]; nextPageToken: string | null }
export interface WalletTransfersResponse { walletId: string; items: WalletTransferRequest[]; nextPageToken: string | null }

export interface WalletsDataSource {
  listWallets(username: string): Promise<ListWalletsResponse>;
  getWalletAssets(walletId: string, username: string): Promise<WalletAssetsResponse>;
  getWalletNfts(walletId: string, username: string): Promise<WalletNftsResponse>;
  probeRestrictedRegion(username: string): Promise<void>;
  getWalletHistory(
    walletId: string,
    username: string,
    query?: { limit?: number; paginationToken?: string },
  ): Promise<WalletHistoryResponse>;
  getWalletTransfers(
    walletId: string,
    username: string,
    query?: { limit?: number; paginationToken?: string },
  ): Promise<WalletTransfersResponse>;
  getTransferById(walletId: string, transferId: string, username: string): Promise<WalletTransferRequest>;
  callFunction(network: string, request: CallFunctionRequest, username: string): Promise<CallFunctionResponse>;
}

function buildPaginationQuery(params?: { limit?: number; paginationToken?: string }): Record<string, string> {
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.paginationToken) query.paginationToken = params.paginationToken;
  return query;
}

function walletPath(walletId: string): string {
  return `/wallets/${encodeURIComponent(walletId)}`;
}

function buildWalletCoreMethods(httpClient: HttpClient) {
  return {
    async listWallets(username: string) {
      const { body } = await httpClient.get<ListWalletsResponse>('/wallets', { headers: { 'X-Username': username } });
      if (body === undefined) throw new Error('Empty response body from listWallets');
      return body;
    },
    async getWalletAssets(walletId: string, username: string) {
      const { body } = await httpClient.get<WalletAssetsResponse>(
        `${walletPath(walletId)}/assets`, { headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from getWalletAssets');
      return body;
    },
    async getWalletNfts(walletId: string, username: string) {
      const { body } = await httpClient.get<WalletNftsResponse>(
        `${walletPath(walletId)}/nfts`, { headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from getWalletNfts');
      return body;
    },
    async probeRestrictedRegion(username: string) {
      await httpClient.post('/wallets/wa-bogus-restricted-region-probe/transactions', {
        body: {}, headers: { 'X-Username': username },
      });
    },
  };
}

function buildWalletHistoryMethods(httpClient: HttpClient) {
  return {
    async getWalletHistory(walletId: string, username: string, params?: { limit?: number; paginationToken?: string }) {
      const query = buildPaginationQuery(params);
      const { body } = await httpClient.get<WalletHistoryResponse>(
        `${walletPath(walletId)}/history`, { query, headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from getWalletHistory');
      return body;
    },
    async getWalletTransfers(walletId: string, username: string, params?: { limit?: number; paginationToken?: string }) {
      const query = buildPaginationQuery(params);
      const { body } = await httpClient.get<WalletTransfersResponse>(
        `${walletPath(walletId)}/transfers`, { query, headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from getWalletTransfers');
      return body;
    },
    async getTransferById(walletId: string, transferId: string, username: string) {
      const { body } = await httpClient.get<WalletTransferRequest>(
        `${walletPath(walletId)}/transfers/${encodeURIComponent(transferId)}`,
        { headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from getTransferById');
      return body;
    },
  };
}

function buildCallFunctionMethod(httpClient: HttpClient) {
  return {
    async callFunction(network: string, request: CallFunctionRequest, username: string) {
      const { body } = await httpClient.post<CallFunctionResponse>(
        `/networks/${encodeURIComponent(network)}/call-function`,
        { body: request, headers: { 'X-Username': username } },
      );
      if (body === undefined) throw new Error('Empty response body from callFunction');
      return body;
    },
  };
}

export function createWalletsDataSource(httpClient: HttpClient): WalletsDataSource {
  return {
    ...buildWalletCoreMethods(httpClient),
    ...buildWalletHistoryMethods(httpClient),
    ...buildCallFunctionMethod(httpClient),
  };
}
