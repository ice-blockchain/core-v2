import type { TokenManager } from '../token/token-manager';
import type { WalletViewsDataSource } from '../data-sources/wallet-views-data-source';
import { extractUserId } from '../token/extract-user-id';
import type {
  WalletViewSummary,
  WalletViewDetail,
  WalletViewInput,
  SymbolGroupBalance,
  PaginationParams,
} from './types';

export interface WalletViewDetailWithPagination extends WalletViewDetail {
  nextPageToken: string | null;
}

interface WalletViewsDeps {
  walletViewsDataSource: WalletViewsDataSource;
  tokenManager: TokenManager;
}

function normalizeBalance(value: unknown): string {
  if (value === null || value === undefined) return '0';
  return String(value);
}

function normalizeAggregation(
  aggregation: Record<string, SymbolGroupBalance>,
): Record<string, SymbolGroupBalance> {
  const result: Record<string, SymbolGroupBalance> = {};
  for (const [key, group] of Object.entries(aggregation)) {
    result[key] = { ...group, totalBalance: normalizeBalance(group.totalBalance) };
  }
  return result;
}

function normalizeSummary(summary: WalletViewSummary): WalletViewSummary {
  return {
    ...summary,
    coins: summary.coins ?? [],
    symbolGroups: summary.symbolGroups ?? [],
  };
}

export async function listWalletViews(
  username: string,
  deps: WalletViewsDeps,
): Promise<WalletViewSummary[]> {
  const userId = await extractUserId(username, deps.tokenManager);
  const summaries = await deps.walletViewsDataSource.listWalletViews(userId, username);
  return summaries.map(normalizeSummary);
}

export async function createWalletView(
  username: string,
  input: WalletViewInput,
  deps: WalletViewsDeps,
): Promise<WalletViewDetail> {
  const userId = await extractUserId(username, deps.tokenManager);
  return deps.walletViewsDataSource.createWalletView(userId, input, username);
}

interface GetWalletViewOptions {
  walletViewId: string;
  params?: PaginationParams;
}

export async function getWalletView(
  username: string,
  options: GetWalletViewOptions,
  deps: WalletViewsDeps,
): Promise<WalletViewDetailWithPagination> {
  const userId = await extractUserId(username, deps.tokenManager);
  const { body, headers } = await deps.walletViewsDataSource.getWalletView(
    userId, options.walletViewId, username, options.params,
  );
  const nextPageToken = headers['x-next-page'] ?? null;
  return { ...body, aggregation: normalizeAggregation(body.aggregation), nextPageToken };
}

interface UpdateWalletViewOptions {
  walletViewId: string;
  input: WalletViewInput;
}

export async function updateWalletView(
  username: string,
  options: UpdateWalletViewOptions,
  deps: WalletViewsDeps,
): Promise<WalletViewDetail> {
  const userId = await extractUserId(username, deps.tokenManager);
  return deps.walletViewsDataSource.updateWalletView(
    userId, options.walletViewId, options.input, username,
  );
}

export async function deleteWalletView(
  username: string,
  walletViewId: string,
  deps: WalletViewsDeps,
): Promise<void> {
  const userId = await extractUserId(username, deps.tokenManager);
  await deps.walletViewsDataSource.deleteWalletView(userId, walletViewId, username);
}
