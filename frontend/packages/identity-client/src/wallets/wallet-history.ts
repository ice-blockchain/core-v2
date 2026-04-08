import type { WalletsDataSource } from '../data-sources/wallets-data-source';

interface WalletHistoryDeps {
  walletsDataSource: WalletsDataSource;
}

interface PaginationParams {
  limit?: number;
  paginationToken?: string;
}

interface WalletHistoryOptions {
  username: string;
  walletId: string;
  params?: PaginationParams | undefined;
}

interface GetTransferOptions {
  username: string;
  walletId: string;
  transferId: string;
}

export async function getWalletHistory(options: WalletHistoryOptions, deps: WalletHistoryDeps) {
  return deps.walletsDataSource.getWalletHistory(options.walletId, options.username, options.params);
}

export async function getWalletTransfers(options: WalletHistoryOptions, deps: WalletHistoryDeps) {
  return deps.walletsDataSource.getWalletTransfers(options.walletId, options.username, options.params);
}

export async function getTransferById(options: GetTransferOptions, deps: WalletHistoryDeps) {
  return deps.walletsDataSource.getTransferById(options.walletId, options.transferId, options.username);
}
