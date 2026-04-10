import {describe, it, expect} from 'vitest';
import type {CoinsGroup, CoinWithBalance, CoinDisplayInfo} from '../types';
import {compareGroups, compareCoins} from './compare-coin-groups';

const DEFAULT_COIN: CoinDisplayInfo = {
  id: 'c1',
  name: 'Test',
  symbol: 'TST',
  symbolGroup: 'test',
  network: 'ethereum',
  contractAddress: '',
  decimals: 18,
  priceUSD: '0',
  iconURL: '',
  native: false,
  prioritized: false,
};

function makeGroup(overrides: Partial<CoinsGroup> = {}): CoinsGroup {
  return {
    name: 'Test',
    symbolGroup: 'test',
    abbreviation: 'TST',
    iconURL: null,
    coins: [],
    totalAmount: 0,
    totalBalanceUSD: 0,
    ...overrides,
  };
}

function makeCoinWithBalance(
  coinOverrides: Partial<CoinDisplayInfo> = {},
  balanceOverrides: Partial<Omit<CoinWithBalance, 'coin'>> = {},
): CoinWithBalance {
  return {
    amount: 0,
    rawAmount: '0',
    balanceUSD: 0,
    walletId: null,
    walletAssetContractAddress: null,
    ...balanceOverrides,
    coin: {...DEFAULT_COIN, ...coinOverrides},
  };
}

describe('compareGroups', () => {
  it('puts ION first regardless of balance', () => {
    const ion = makeGroup({symbolGroup: 'ion', totalBalanceUSD: 0});
    const btc = makeGroup({symbolGroup: 'bitcoin', totalBalanceUSD: 99999});
    expect(compareGroups(ion, btc)).toBeLessThan(0);
  });

  it('pushes ICE with balance < $0.01 to end', () => {
    const ice = makeGroup({symbolGroup: 'ice', totalBalanceUSD: 0.001});
    const other = makeGroup({symbolGroup: 'random', totalBalanceUSD: 0});
    expect(compareGroups(ice, other)).toBeGreaterThan(0);
  });

  it('sorts ICE with balance >= $0.01 normally by USD', () => {
    const ice = makeGroup({symbolGroup: 'ice', totalBalanceUSD: 100});
    const other = makeGroup({symbolGroup: 'random', totalBalanceUSD: 50});
    expect(compareGroups(ice, other)).toBeLessThan(0);
  });

  it('sorts higher USD balance before lower', () => {
    const high = makeGroup({symbolGroup: 'a', totalBalanceUSD: 1000});
    const low = makeGroup({symbolGroup: 'b', totalBalanceUSD: 100});
    expect(compareGroups(high, low)).toBeLessThan(0);
  });

  it('sorts prioritized before unprioritized at same balance', () => {
    const prioritized = makeGroup({
      symbolGroup: 'a',
      totalBalanceUSD: 0,
      coins: [makeCoinWithBalance({prioritized: true})],
    });
    const normal = makeGroup({symbolGroup: 'b', totalBalanceUSD: 0});
    expect(compareGroups(prioritized, normal)).toBeLessThan(0);
  });

  it('sorts bitcoin before dogecoin by priority list', () => {
    const btc = makeGroup({symbolGroup: 'bitcoin', totalBalanceUSD: 0});
    const doge = makeGroup({symbolGroup: 'dogecoin', totalBalanceUSD: 0});
    expect(compareGroups(btc, doge)).toBeLessThan(0);
  });

  it('sorts priority list coin before unlisted coin', () => {
    const eth = makeGroup({symbolGroup: 'ethereum', totalBalanceUSD: 0});
    const unknown = makeGroup({symbolGroup: 'zzz-coin', totalBalanceUSD: 0});
    expect(compareGroups(eth, unknown)).toBeLessThan(0);
  });

  it('falls back to alphabetical for equal priority', () => {
    const a = makeGroup({symbolGroup: 'alpha', totalBalanceUSD: 0});
    const b = makeGroup({symbolGroup: 'beta', totalBalanceUSD: 0});
    expect(compareGroups(a, b)).toBeLessThan(0);
  });
});

describe('compareCoins', () => {
  it('sorts native before non-native within same group', () => {
    const native = makeCoinWithBalance({native: true, symbolGroup: 'x'});
    const token = makeCoinWithBalance({native: false, symbolGroup: 'x'});
    expect(compareCoins(native, token)).toBeLessThan(0);
  });

  it('sorts by network alphabetically as final tiebreaker', () => {
    const a = makeCoinWithBalance({symbolGroup: 'x', network: 'arbitrum'});
    const b = makeCoinWithBalance({symbolGroup: 'x', network: 'polygon'});
    expect(compareCoins(a, b)).toBeLessThan(0);
  });

  it('applies ION-first rule to coins', () => {
    const ion = makeCoinWithBalance({symbolGroup: 'ion'}, {balanceUSD: 0});
    const btc = makeCoinWithBalance({symbolGroup: 'bitcoin'}, {balanceUSD: 9999});
    expect(compareCoins(ion, btc)).toBeLessThan(0);
  });
});
