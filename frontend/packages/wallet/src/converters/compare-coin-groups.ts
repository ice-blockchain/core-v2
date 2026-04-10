import type {CoinsGroup, CoinWithBalance} from '../types';

const PRIORITY_LIST = [
  'ion', 'binancecoin', 'bitcoin', 'ethereum', 'solana',
  'the-open-network', 'dogecoin', 'litecoin', 'stellar', 'tron',
  'ripple', 'tezos', 'matic-network', 'polkadot', 'optimism',
  'cardano', 'algorand', 'kusama', 'avalanche-2', 'kaspa',
  'arbitrum', 'token-s', 'aptos',
];

interface CompareInput {
  symbolGroup: string;
  totalBalanceUSD: number;
  isPrioritized: boolean;
  isNative?: boolean;
  network?: string;
}

function compare(a: CompareInput, b: CompareInput): number {
  const aIsIon = a.symbolGroup.toLowerCase() === 'ion';
  const bIsIon = b.symbolGroup.toLowerCase() === 'ion';
  if (aIsIon !== bIsIon) {
    return aIsIon ? -1 : 1;
  }

  const aIsLowIce = isLowBalanceIce(a);
  const bIsLowIce = isLowBalanceIce(b);
  if (aIsLowIce !== bIsLowIce) {
    return aIsLowIce ? 1 : -1;
  }

  if (a.totalBalanceUSD !== b.totalBalanceUSD) {
    return b.totalBalanceUSD - a.totalBalanceUSD;
  }

  if (a.isPrioritized !== b.isPrioritized) {
    return a.isPrioritized ? -1 : 1;
  }

  const aPriority = getPriorityIndex(a.symbolGroup);
  const bPriority = getPriorityIndex(b.symbolGroup);
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  return a.symbolGroup.toLowerCase().localeCompare(b.symbolGroup.toLowerCase());
}

function isLowBalanceIce(input: CompareInput): boolean {
  return input.symbolGroup.toLowerCase() === 'ice' && input.totalBalanceUSD < 0.01;
}

function getPriorityIndex(symbolGroup: string): number {
  const index = PRIORITY_LIST.indexOf(symbolGroup.toLowerCase());
  return index === -1 ? PRIORITY_LIST.length : index;
}

function hasAnyPrioritized(group: CoinsGroup): boolean {
  return group.coins.some((coin) => coin.coin.prioritized);
}

export function compareGroups(a: CoinsGroup, b: CoinsGroup): number {
  return compare(
    {
      symbolGroup: a.symbolGroup,
      totalBalanceUSD: a.totalBalanceUSD,
      isPrioritized: hasAnyPrioritized(a),
    },
    {
      symbolGroup: b.symbolGroup,
      totalBalanceUSD: b.totalBalanceUSD,
      isPrioritized: hasAnyPrioritized(b),
    },
  );
}

export function compareCoins(a: CoinWithBalance, b: CoinWithBalance): number {
  const base = compare(
    {
      symbolGroup: a.coin.symbolGroup,
      totalBalanceUSD: a.balanceUSD,
      isPrioritized: a.coin.prioritized,
    },
    {
      symbolGroup: b.coin.symbolGroup,
      totalBalanceUSD: b.balanceUSD,
      isPrioritized: b.coin.prioritized,
    },
  );
  if (base !== 0) {
    return base;
  }

  if (a.coin.native !== b.coin.native) {
    return a.coin.native ? -1 : 1;
  }

  return a.coin.network.localeCompare(b.coin.network);
}
