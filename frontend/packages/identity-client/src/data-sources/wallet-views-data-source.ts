import type { HttpClient } from '@ion/network';
import type { WalletViewSummary, WalletViewDetail, WalletViewInput } from '../wallets/types';

interface GetWalletViewQuery {
  limit?: number;
  paginationToken?: string;
}

interface GetWalletViewResult {
  body: WalletViewDetail;
  headers: Record<string, string>;
}

export interface WalletViewsDataSource {
  listWalletViews(userId: string, username: string): Promise<WalletViewSummary[]>;
  createWalletView(userId: string, input: WalletViewInput, username: string): Promise<WalletViewDetail>;
  getWalletView(
    userId: string,
    walletViewId: string,
    username: string,
    query?: GetWalletViewQuery,
  ): Promise<GetWalletViewResult>;
  updateWalletView(
    userId: string,
    walletViewId: string,
    input: WalletViewInput,
    username: string,
  ): Promise<WalletViewDetail>;
  deleteWalletView(userId: string, walletViewId: string, username: string): Promise<void>;
}

function buildViewsPath(userId: string): string {
  return `/v1/users/${encodeURIComponent(userId)}/wallet-views`;
}

function buildViewPath(userId: string, walletViewId: string): string {
  return `${buildViewsPath(userId)}/${encodeURIComponent(walletViewId)}`;
}

function buildGetQuery(params?: GetWalletViewQuery): Record<string, string> {
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.paginationToken) query.paginationToken = params.paginationToken;
  return query;
}

export function createWalletViewsDataSource(httpClient: HttpClient): WalletViewsDataSource {
  return {
    async listWalletViews(userId, username) {
      const response = await httpClient.get<WalletViewSummary[]>(buildViewsPath(userId), {
        headers: { 'X-Username': username },
      });
      return response.body;
    },

    async createWalletView(userId, input, username) {
      const response = await httpClient.post<WalletViewDetail>(buildViewsPath(userId), {
        headers: { 'X-Username': username },
        body: input,
      });
      return response.body;
    },

    async getWalletView(userId, walletViewId, username, params) {
      const response = await httpClient.get<WalletViewDetail>(buildViewPath(userId, walletViewId), {
        headers: { 'X-Username': username },
        query: buildGetQuery(params),
      });
      return { body: response.body, headers: response.headers };
    },

    async updateWalletView(userId, walletViewId, input, username) {
      const response = await httpClient.put<WalletViewDetail>(buildViewPath(userId, walletViewId), {
        headers: { 'X-Username': username },
        body: input,
      });
      return response.body;
    },

    async deleteWalletView(userId, walletViewId, username) {
      await httpClient.delete(buildViewPath(userId, walletViewId), {
        headers: { 'X-Username': username },
      });
    },
  };
}
