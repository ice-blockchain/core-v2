import { describe, it, expect, vi } from 'vitest';
import type { CoinsDataSource } from '../data-sources/coins-data-source';
import type { Coin, CoinNetwork, CoinsResponse } from './types';
import { getCoins, syncCoins, getCoinsBySymbolGroup, getCoinData, searchCoins } from './coins';

vi.mock('../token/extract-user-id', () => ({
  extractUserId: vi.fn().mockResolvedValue('user-123'),
}));

const NANO_MS = 1_000_000;

function makeCoin(overrides?: Partial<Coin>): Coin {
  return {
    id: 'btc-1',
    name: 'Bitcoin',
    symbol: 'BTC',
    symbolGroup: 'BTC',
    network: 'bitcoin',
    contractAddress: '',
    decimals: 8,
    priceUSD: '60000',
    iconURL: 'https://example.com/btc.png',
    syncFrequency: 30_000 * NANO_MS,
    native: true,
    prioritized: true,
    ...overrides,
  };
}

const mockNetwork: CoinNetwork = {
  id: 'bitcoin', displayName: 'Bitcoin', explorerUrl: 'https://btc.com',
  image: 'https://example.com/btc-net.png', isTestnet: false, tier: 1,
};

function createMockDeps() {
  const coinsDataSource: CoinsDataSource = {
    getCoins: vi.fn(),
    syncCoins: vi.fn(),
    getCoinsBySymbolGroup: vi.fn(),
    getCoinData: vi.fn(),
    searchCoins: vi.fn(),
  };
  const tokenManager = { getTokens: vi.fn(), setTokens: vi.fn(), clearTokens: vi.fn(), isTokenExpired: vi.fn(), getTrackedUsers: vi.fn() };
  return { coinsDataSource, tokenManager };
}

describe('getCoins', () => {
  it('converts syncFrequency from nanoseconds to milliseconds', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin({ syncFrequency: 30_000 * NANO_MS });
    const response: CoinsResponse = { coins: [rawCoin], networks: [mockNetwork], version: 2 };
    vi.mocked(deps.coinsDataSource.getCoins).mockResolvedValue(response);

    const result = await getCoins('alice', 1, deps);

    expect(result.coins[0]!.syncFrequency).toBe(30_000);
    expect(result.networks).toEqual([mockNetwork]);
    expect(result.version).toBe(2);
  });

  it('sets native and prioritized defaults to false when missing', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (rawCoin as any).native;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (rawCoin as any).prioritized;
    const response: CoinsResponse = { coins: [rawCoin], networks: [], version: 1 };
    vi.mocked(deps.coinsDataSource.getCoins).mockResolvedValue(response);

    const result = await getCoins('alice', 1, deps);

    expect(result.coins[0]!.native).toBe(false);
    expect(result.coins[0]!.prioritized).toBe(false);
  });

  it('returns empty arrays when response body is null', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.coinsDataSource.getCoins).mockResolvedValue(null as unknown as CoinsResponse);

    const result = await getCoins('alice', 1, deps);

    expect(result).toEqual({ coins: [], networks: [], version: 1 });
  });

  it('returns empty arrays when response has no coins property', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.coinsDataSource.getCoins).mockResolvedValue({} as CoinsResponse);

    const result = await getCoins('alice', 1, deps);

    expect(result).toEqual({ coins: [], networks: [], version: 1 });
  });
});

describe('syncCoins', () => {
  it('normalizes coins returned from syncCoins', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin({ syncFrequency: 5_000 * NANO_MS });
    vi.mocked(deps.coinsDataSource.syncCoins).mockResolvedValue([rawCoin]);

    const result = await syncCoins('alice', ['BTC'], deps);

    expect(result[0]!.syncFrequency).toBe(5_000);
    expect(deps.coinsDataSource.syncCoins).toHaveBeenCalledWith(['BTC'], 'alice');
  });
});

describe('getCoinsBySymbolGroup', () => {
  it('extracts userId and normalizes coins', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin({ syncFrequency: 10_000 * NANO_MS });
    vi.mocked(deps.coinsDataSource.getCoinsBySymbolGroup).mockResolvedValue([rawCoin]);

    const result = await getCoinsBySymbolGroup('alice', 'BTC', deps);

    expect(result[0]!.syncFrequency).toBe(10_000);
    expect(deps.coinsDataSource.getCoinsBySymbolGroup).toHaveBeenCalledWith('user-123', 'BTC', 'alice');
  });
});

describe('getCoinData', () => {
  it('normalizes a single coin', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin({ syncFrequency: 60_000 * NANO_MS });
    vi.mocked(deps.coinsDataSource.getCoinData).mockResolvedValue(rawCoin);

    const result = await getCoinData({ username: 'alice', contractAddress: '0xabc', network: 'ethereum' }, deps);

    expect(result.syncFrequency).toBe(60_000);
    expect(deps.coinsDataSource.getCoinData).toHaveBeenCalledWith('0xabc', 'ethereum', 'alice');
  });
});

describe('searchCoins', () => {
  it('passes through params and normalizes results', async () => {
    const deps = createMockDeps();
    const rawCoin = makeCoin({ syncFrequency: 15_000 * NANO_MS });
    vi.mocked(deps.coinsDataSource.searchCoins).mockResolvedValue([rawCoin]);

    const result = await searchCoins({ username: 'alice', keyword: 'bit', params: { limit: 10, offset: 0 } }, deps);

    expect(result[0]!.syncFrequency).toBe(15_000);
    expect(deps.coinsDataSource.searchCoins).toHaveBeenCalledWith('bit', 'alice', { limit: 10, offset: 0 });
  });
});
