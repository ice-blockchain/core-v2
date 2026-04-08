import { NetworkError } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { Logger } from '@ion/diagnostics';

import type { Coin, CoinsResponse } from '../coins/types';

export interface CoinsDataSource {
  getCoins(userId: string, version: number, username: string): Promise<CoinsResponse>;
  syncCoins(symbolGroups: string[], username: string): Promise<Coin[]>;
  getCoinsBySymbolGroup(userId: string, symbolGroup: string, username: string): Promise<Coin[]>;
  getCoinData(contractAddress: string, network: string, username: string): Promise<Coin>;
  searchCoins(
    keyword: string,
    username: string,
    params?: { limit?: number; offset?: number },
  ): Promise<Coin[]>;
}

function buildSyncCoinsUrl(symbolGroups: string[]): string {
  const params = symbolGroups.map(sg => `symbolGroup=${encodeURIComponent(sg)}`).join('&');
  return `/v1/sync-coins?${params}`;
}

function buildSearchQuery(keyword: string, params?: { limit?: number; offset?: number }): Record<string, string> {
  const query: Record<string, string> = { keyword };
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);
  return query;
}

function createGetCoins(httpClient: HttpClient): CoinsDataSource['getCoins'] {
  return async (userId, version, username) => {
    const { body } = await httpClient.get<CoinsResponse>(
      `/v1/users/${encodeURIComponent(userId)}/coins`,
      { query: { version: String(version) }, headers: { 'X-Username': username } },
    );
    return body;
  };
}

function createSyncCoins(httpClient: HttpClient): CoinsDataSource['syncCoins'] {
  return async (symbolGroups, username) => {
    const { body } = await httpClient.patch<Coin[]>(buildSyncCoinsUrl(symbolGroups), {
      headers: { 'X-Username': username },
    });
    return body;
  };
}

function createGetCoinsBySymbolGroup(httpClient: HttpClient): CoinsDataSource['getCoinsBySymbolGroup'] {
  return async (userId, symbolGroup, username) => {
    const { body } = await httpClient.get<Coin[]>(
      `/v1/users/${encodeURIComponent(userId)}/coins/${encodeURIComponent(symbolGroup)}`,
      { headers: { 'X-Username': username } },
    );
    return body;
  };
}

function createGetCoinData(httpClient: HttpClient): CoinsDataSource['getCoinData'] {
  return async (contractAddress, network, username) => {
    const { body } = await httpClient.post<Coin>('/v1/coins', {
      body: { contractAddress, network },
      headers: { 'X-Username': username },
    });
    return body;
  };
}

function createSearchCoins(httpClient: HttpClient): CoinsDataSource['searchCoins'] {
  return async (keyword, username, params) => {
    try {
      const { body } = await httpClient.get<Coin[]>('/v2/coins', {
        query: buildSearchQuery(keyword, params),
        headers: { 'X-Username': username },
      });
      return body;
    } catch (error) {
      if (error instanceof NetworkError && error.code === 'PARSE_ERROR') {
        Logger.warning('searchCoins returned unparseable response, returning empty', { data: { keyword } });
        return [];
      }
      throw error;
    }
  };
}

export function createCoinsDataSource(httpClient: HttpClient): CoinsDataSource {
  return {
    getCoins: createGetCoins(httpClient),
    syncCoins: createSyncCoins(httpClient),
    getCoinsBySymbolGroup: createGetCoinsBySymbolGroup(httpClient),
    getCoinData: createGetCoinData(httpClient),
    searchCoins: createSearchCoins(httpClient),
  };
}
