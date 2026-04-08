import type { WalletsDataSource } from '../data-sources/wallets-data-source';

interface WalletHistoryDeps {
  walletsDataSource: WalletsDataSource;
}

interface PaginationParams {
  limit?: number;
  paginationToken?: string;
}

export async function getWalletHistory(
  username: string,
  walletId: string,
  params: PaginationParams | undefined,
  deps: WalletHistoryDeps,
) {
  return deps.walletsDataSource.getWalletHistory(walletId, username, params);
}

export async function getWalletTransfers(
  username: string,
  walletId: string,
  params: PaginationParams | undefined,
  deps: WalletHistoryDeps,
) {
  return deps.walletsDataSource.getWalletTransfers(walletId, username, params);
}

export async function getTransferById(
  username: string,
  walletId: string,
  transferId: string,
  deps: WalletHistoryDeps,
) {
  return deps.walletsDataSource.getTransferById(walletId, transferId, username);
}
