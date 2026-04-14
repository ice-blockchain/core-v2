import { NetworkError } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import type { WalletViewSummary, WalletViewDetail, WalletViewInput } from '../wallets/types';

interface GetWalletViewQuery { limit?: number; paginationToken?: string }
interface GetWalletViewResult { body: WalletViewDetail; headers: Record<string, string> }
interface GetWalletViewOptions { userId: string; walletViewId: string; username: string; query?: GetWalletViewQuery | undefined }
interface UpdateWalletViewOptions { userId: string; walletViewId: string; input: WalletViewInput; username: string }

export interface WalletViewsDataSource {
  listWalletViews(userId: string, username: string): Promise<WalletViewSummary[]>;
  createWalletView(userId: string, input: WalletViewInput, username: string): Promise<WalletViewDetail>;
  getWalletView(options: GetWalletViewOptions): Promise<GetWalletViewResult>;
  updateWalletView(options: UpdateWalletViewOptions): Promise<WalletViewDetail>;
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

function buildViewsReadMethods(httpClient: HttpClient) {
  return {
    async listWalletViews(userId: string, username: string) {
      const response = await httpClient.get<WalletViewSummary[]>(buildViewsPath(userId), {
        headers: { 'X-Username': username },
      });
      if (response.body === undefined) throw new Error('Empty response body from listWalletViews');
      return response.body;
    },
    async getWalletView(options: GetWalletViewOptions) {
      const response = await httpClient.get<WalletViewDetail>(buildViewPath(options.userId, options.walletViewId), {
        headers: { 'X-Username': options.username },
        query: buildGetQuery(options.query),
      });
      if (response.body === undefined) throw new Error('Empty response body from getWalletView');
      return { body: response.body, headers: response.headers };
    },
  };
}

function buildViewsWriteMethods(httpClient: HttpClient) {
  return {
    async createWalletView(userId: string, input: WalletViewInput, username: string) {
      const response = await httpClient.post<WalletViewDetail>(buildViewsPath(userId), {
        headers: { 'X-Username': username },
        body: input,
      });
      if (response.body === undefined) throw new Error('Empty response body from createWalletView');
      return response.body;
    },
    async updateWalletView(options: UpdateWalletViewOptions) {
      const response = await httpClient.put<WalletViewDetail>(buildViewPath(options.userId, options.walletViewId), {
        headers: { 'X-Username': options.username },
        body: options.input,
      });
      if (response.body === undefined) throw new Error('Empty response body from updateWalletView');
      return response.body;
    },
    deleteWalletView: (userId: string, walletViewId: string, username: string) =>
      executeDeleteWalletView({ httpClient, userId, walletViewId, username }),
  };
}

interface DeleteOptions { httpClient: HttpClient; userId: string; walletViewId: string; username: string }

async function executeDeleteWalletView({ httpClient, userId, walletViewId, username }: DeleteOptions): Promise<void> {
  try {
    await httpClient.delete(buildViewPath(userId, walletViewId), { headers: { 'X-Username': username } });
  } catch (error) {
    if (error instanceof NetworkError && error.code === 'PARSE_ERROR') {
      Logger.warning('deleteWalletView returned unparseable response, treating as success', { data: { userId, walletViewId } });
      return;
    }
    throw error;
  }
}

export function createWalletViewsDataSource(httpClient: HttpClient): WalletViewsDataSource {
  return {
    ...buildViewsReadMethods(httpClient),
    ...buildViewsWriteMethods(httpClient),
  };
}
