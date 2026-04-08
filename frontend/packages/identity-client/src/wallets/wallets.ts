import { NetworkError } from '@ion/network';

import { executeSignedRequest } from '../auth/execute-signed-request';
import { IdentityError, IdentityErrorCode } from '../errors';
import type { SigningContext } from '../types';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { WalletsDataSource } from '../data-sources/wallets-data-source';
import type { HttpClient } from '@ion/network';
import type { Wallet, WalletAsset, CreateWalletInput } from './types';

interface WalletReadDeps {
  walletsDataSource: WalletsDataSource;
}

interface WalletWriteDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

function normalizeAssetBalance(asset: WalletAsset): WalletAsset {
  return { ...asset, balance: String(asset.balance) };
}

function isRestrictedRegionError(error: unknown): boolean {
  if (!(error instanceof NetworkError)) return false;
  const body = error.responseBody as Record<string, unknown> | undefined;
  const code = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
  return code === 'RESTRICTED_REGION';
}

export async function listWallets(username: string, deps: WalletReadDeps): Promise<Wallet[]> {
  const response = await deps.walletsDataSource.listWallets(username);
  return response.items;
}

export async function getWalletAssets(username: string, walletId: string, deps: WalletReadDeps) {
  const response = await deps.walletsDataSource.getWalletAssets(walletId, username);
  return { ...response, assets: response.assets.map(normalizeAssetBalance) };
}

export async function getWalletNfts(username: string, walletId: string, deps: WalletReadDeps) {
  const response = await deps.walletsDataSource.getWalletNfts(walletId, username);
  return response.nfts;
}

export async function createWallet(
  username: string,
  input: CreateWalletInput,
  signingContext: SigningContext,
  deps: WalletWriteDeps,
): Promise<Wallet> {
  return executeSignedRequest<Wallet>(
    { username, httpMethod: 'POST', httpPath: '/wallets', body: input, signingContext },
    deps,
  );
}

export async function probeRestrictedRegion(deps: WalletReadDeps): Promise<null> {
  try {
    await deps.walletsDataSource.probeRestrictedRegion();
    return null;
  } catch (error) {
    if (isRestrictedRegionError(error)) {
      throw new IdentityError(IdentityErrorCode.RESTRICTED_REGION, 'Restricted region', error);
    }
    throw error;
  }
}
