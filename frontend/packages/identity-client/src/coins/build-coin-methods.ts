import type { TokenManager } from '../token/token-manager';
import type { CoinsDataSource } from '../data-sources/coins-data-source';
import { getCoins, syncCoins, getCoinsBySymbolGroup, getCoinData, searchCoins } from './coins';

interface CoinContext {
  coinsDataSource: CoinsDataSource;
  tokenManager: TokenManager;
}

export function buildCoinMethods(c: CoinContext) {
  const deps = { coinsDataSource: c.coinsDataSource, tokenManager: c.tokenManager };

  return {
    getCoins: (username: string, version: number) => getCoins(username, version, deps),
    syncCoins: (username: string, symbolGroups: string[]) => syncCoins(username, symbolGroups, deps),
    getCoinsBySymbolGroup: (username: string, symbolGroup: string) =>
      getCoinsBySymbolGroup(username, symbolGroup, deps),
    getCoinData: (username: string, contractAddress: string, network: string) =>
      getCoinData({ username, contractAddress, network }, deps),
    searchCoins: (username: string, keyword: string, params?: { limit?: number; offset?: number }) =>
      searchCoins({ username, keyword, params }, deps),
  };
}
