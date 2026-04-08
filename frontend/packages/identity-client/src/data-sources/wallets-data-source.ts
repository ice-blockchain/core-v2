import type { HttpClient } from '@ion/network';

import type {
  Wallet,
  WalletNft,
  WalletAsset,
  WalletHistoryItem,
  WalletTransferRequest,
  CallFunctionRequest,
} from '../wallets/types';

interface ListWalletsResponse {
  items: Wallet[];
}

interface WalletAssetsResponse {
  walletId: string;
  network: string;
  assets: WalletAsset[];
}

interface WalletNftsResponse {
  walletId: string;
  network: string;
  nfts: WalletNft[];
}

interface WalletHistoryResponse {
  items: WalletHistoryItem[];
  nextPageToken: string | null;
}

interface WalletTransfersResponse {
  walletId: string;
  items: WalletTransferRequest[];
  nextPageToken: string | null;
}

export interface WalletsDataSource {
  listWallets(username: string): Promise<ListWalletsResponse>;
  getWalletAssets(walletId: string, username: string): Promise<WalletAssetsResponse>;
  getWalletNfts(walletId: string, username: string): Promise<WalletNftsResponse>;
  probeRestrictedRegion(): Promise<unknown>;
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
  callFunction(network: string, request: CallFunctionRequest, username: string): Promise<unknown>;
}

function buildPaginationQuery(params?: { limit?: number; paginationToken?: string }): Record<string, string> {
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.paginationToken) query.paginationToken = params.paginationToken;
  return query;
}

export function createWalletsDataSource(httpClient: HttpClient): WalletsDataSource {
  return {
    async listWallets(username) {
      const { body } = await httpClient.get<ListWalletsResponse>('/wallets', {
        headers: { 'X-Username': username },
      });
      return body;
    },

    async getWalletAssets(walletId, username) {
      const { body } = await httpClient.get<WalletAssetsResponse>(
        `/wallets/${encodeURIComponent(walletId)}/assets`,
        { headers: { 'X-Username': username } },
      );
      return body;
    },

    async getWalletNfts(walletId, username) {
      const { body } = await httpClient.get<WalletNftsResponse>(
        `/wallets/${encodeURIComponent(walletId)}/nfts`,
        { headers: { 'X-Username': username } },
      );
      return body;
    },

    async probeRestrictedRegion() {
      const { body } = await httpClient.post<unknown>(
        '/wallets/wa-bogus-restricted-region-probe/transactions',
        { body: {} },
      );
      return body;
    },

    async getWalletHistory(walletId, username, params) {
      const query = buildPaginationQuery(params);
      const { body } = await httpClient.get<WalletHistoryResponse>(
        `/wallets/${encodeURIComponent(walletId)}/history`,
        { query, headers: { 'X-Username': username } },
      );
      return body;
    },

    async getWalletTransfers(walletId, username, params) {
      const query = buildPaginationQuery(params);
      const { body } = await httpClient.get<WalletTransfersResponse>(
        `/wallets/${encodeURIComponent(walletId)}/transfers`,
        { query, headers: { 'X-Username': username } },
      );
      return body;
    },

    async getTransferById(walletId, transferId, username) {
      const { body } = await httpClient.get<WalletTransferRequest>(
        `/wallets/${encodeURIComponent(walletId)}/transfers/${encodeURIComponent(transferId)}`,
        { headers: { 'X-Username': username } },
      );
      return body;
    },

    async callFunction(network, request, username) {
      const { body } = await httpClient.post<unknown>(
        `/networks/${encodeURIComponent(network)}/call-function`,
        { body: request, headers: { 'X-Username': username } },
      );
      return body;
    },
  };
}
