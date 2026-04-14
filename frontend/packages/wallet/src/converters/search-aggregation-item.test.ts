import {describe, it, expect} from 'vitest';
import type {
  WalletViewAggregationWallet,
  WalletViewCoin,
  SymbolGroupBalance,
  WalletAsset,
} from '@ion/identity-client';
import {
  isMatchingWallet,
  searchAggregationItem,
  buildAggregationWalletKey,
} from './search-aggregation-item';

function makeCoin(overrides: Partial<WalletViewCoin> = {}): WalletViewCoin {
  return {
    walletId: 'wallet-1',
    id: 'coin-1',
    name: 'Ether',
    symbol: 'ETH',
    symbolGroup: 'ethereum',
    network: 'ethereum',
    contractAddress: '0xabc',
    decimals: 18,
    priceUSD: '2000',
    iconURL: '',
    syncFrequency: 60,
    native: true,
    prioritized: false,
    ...overrides,
  };
}

function makeWallet(
  overrides: Partial<WalletViewAggregationWallet> & {asset?: Partial<WalletAsset>} = {},
): WalletViewAggregationWallet {
  const {asset: assetOverrides, ...rest} = overrides;
  return {
    walletId: 'wallet-1',
    network: 'ethereum',
    coinId: 'coin-1',
    asset: {
      kind: 'Erc20',
      decimals: 18,
      balance: '1000000000000000000',
      contract: '0xABC',
      ...assetOverrides,
    } as WalletAsset,
    ...rest,
  };
}

describe('isMatchingWallet', () => {
  it('matches by walletId and contract address (case-insensitive)', () => {
    const wallet = makeWallet();
    const coin = makeCoin({contractAddress: '0xabc'});
    expect(isMatchingWallet(wallet, coin)).toBe(true);
  });

  it('matches by walletId and coinId when no contract', () => {
    const wallet = makeWallet({
      coinId: 'coin-1',
      asset: {kind: 'Spl', decimals: 9, balance: '100', mint: 'abc'} as WalletAsset,
    });
    const coin = makeCoin({contractAddress: '', id: 'coin-1'});
    expect(isMatchingWallet(wallet, coin)).toBe(true);
  });

  it('matches when wallet.coinId is null (wildcard)', () => {
    const wallet = makeWallet({
      coinId: null,
      asset: {kind: 'Spl', decimals: 9, balance: '100', mint: 'abc'} as WalletAsset,
    });
    const coin = makeCoin({contractAddress: '', id: 'coin-99'});
    expect(isMatchingWallet(wallet, coin)).toBe(true);
  });

  it('does not match when walletId differs', () => {
    const wallet = makeWallet({walletId: 'wallet-2'});
    const coin = makeCoin({walletId: 'wallet-1'});
    expect(isMatchingWallet(wallet, coin)).toBe(false);
  });

  it('does not match when coinId differs and no contract', () => {
    const wallet = makeWallet({
      coinId: 'coin-other',
      asset: {kind: 'Spl', decimals: 9, balance: '100', mint: 'abc'} as WalletAsset,
    });
    const coin = makeCoin({contractAddress: '', id: 'coin-1'});
    expect(isMatchingWallet(wallet, coin)).toBe(false);
  });
});

describe('searchAggregationItem', () => {
  it('finds item via phase 1 symbol key lookup', () => {
    const wallet = makeWallet();
    const aggregation: Record<string, SymbolGroupBalance> = {
      eth: {wallets: [wallet], totalBalance: '1000000000000000000'},
    };
    const coin = makeCoin({symbol: 'ETH'});
    const result = searchAggregationItem(coin, aggregation);
    expect(result).not.toBeNull();
    expect(result!.wallet.walletId).toBe('wallet-1');
  });

  it('finds item via phase 2 exhaustive search', () => {
    const wallet = makeWallet();
    const aggregation: Record<string, SymbolGroupBalance> = {
      other: {wallets: [wallet], totalBalance: '1000000000000000000'},
    };
    const coin = makeCoin({symbol: 'ETH'});
    const result = searchAggregationItem(coin, aggregation);
    expect(result).not.toBeNull();
    expect(result!.item.totalBalance).toBe('1000000000000000000');
  });

  it('returns null when network does not match', () => {
    const wallet = makeWallet({network: 'polygon'});
    const aggregation: Record<string, SymbolGroupBalance> = {
      eth: {wallets: [wallet], totalBalance: '1000'},
    };
    const coin = makeCoin({symbol: 'ETH', network: 'ethereum'});
    expect(searchAggregationItem(coin, aggregation)).toBeNull();
  });

  it('returns null when no wallets match', () => {
    const wallet = makeWallet({walletId: 'wallet-other'});
    const aggregation: Record<string, SymbolGroupBalance> = {
      eth: {wallets: [wallet], totalBalance: '1000'},
    };
    const coin = makeCoin({walletId: 'wallet-1'});
    expect(searchAggregationItem(coin, aggregation)).toBeNull();
  });
});

describe('buildAggregationWalletKey', () => {
  it('builds key with contract address', () => {
    const wallet = makeWallet({
      walletId: 'w1',
      network: 'ethereum',
      asset: {kind: 'Erc20', decimals: 18, balance: '0', contract: '0xDEF'} as WalletAsset,
    });
    expect(buildAggregationWalletKey(wallet)).toBe('w1|ethereum|0xdef');
  });

  it('builds key with coinId when no contract', () => {
    const wallet = makeWallet({
      walletId: 'w1',
      network: 'solana',
      coinId: 'sol-coin',
      asset: {kind: 'Spl', decimals: 9, balance: '0', mint: 'x'} as WalletAsset,
    });
    expect(buildAggregationWalletKey(wallet)).toBe('w1|solana|sol-coin');
  });

  it('builds key with null coinId when no contract', () => {
    const wallet = makeWallet({
      walletId: 'w1',
      network: 'solana',
      coinId: null,
      asset: {kind: 'Spl', decimals: 9, balance: '0', mint: 'x'} as WalletAsset,
    });
    expect(buildAggregationWalletKey(wallet)).toBe('w1|solana|null');
  });
});
