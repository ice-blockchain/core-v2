import type { TokenManager } from '../token/token-manager';
import type { CoinsDataSource } from '../data-sources/coins-data-source';
import { extractUserId } from '../token/extract-user-id';
import type { Coin, CoinsResponse } from './types';

interface CoinsDeps {
  coinsDataSource: CoinsDataSource;
  tokenManager: TokenManager;
}

function normalizeCoin(coin: Coin): Coin {
  return {
    ...coin,
    syncFrequency: Math.floor(coin.syncFrequency / 1_000_000),
    native: coin.native ?? false,
    prioritized: coin.prioritized ?? false,
  };
}

export async function getCoins(username: string, version: number, deps: CoinsDeps): Promise<CoinsResponse> {
  const userId = await extractUserId(username, deps.tokenManager);
  const response = await deps.coinsDataSource.getCoins(userId, version, username);
  if (!response || !response.coins) {
    return { coins: [], networks: [], version };
  }
  return {
    coins: response.coins.map(normalizeCoin),
    networks: response.networks ?? [],
    version: response.version,
  };
}

export async function syncCoins(username: string, symbolGroups: string[], deps: CoinsDeps): Promise<Coin[]> {
  const coins = await deps.coinsDataSource.syncCoins(symbolGroups, username);
  return coins.map(normalizeCoin);
}

export async function getCoinsBySymbolGroup(
  username: string, symbolGroup: string, deps: CoinsDeps,
): Promise<Coin[]> {
  const userId = await extractUserId(username, deps.tokenManager);
  const coins = await deps.coinsDataSource.getCoinsBySymbolGroup(userId, symbolGroup, username);
  return coins.map(normalizeCoin);
}

interface GetCoinDataOptions {
  username: string;
  contractAddress: string;
  network: string;
}

export async function getCoinData(options: GetCoinDataOptions, deps: CoinsDeps): Promise<Coin> {
  const coin = await deps.coinsDataSource.getCoinData(options.contractAddress, options.network, options.username);
  return normalizeCoin(coin);
}

interface SearchCoinsOptions {
  username: string;
  keyword: string;
  params?: { limit?: number; offset?: number } | undefined;
}

export async function searchCoins(options: SearchCoinsOptions, deps: CoinsDeps): Promise<Coin[]> {
  const coins = await deps.coinsDataSource.searchCoins(options.keyword, options.username, options.params);
  return coins.map(normalizeCoin);
}
