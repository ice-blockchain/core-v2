import type { CoinWithBalance } from '../types';
import { compareBySortRules } from './coin-sort-utils';

export function compareCoins(a: CoinWithBalance, b: CoinWithBalance): number {
  const base = compareBySortRules(
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
  if (base !== 0) return base;

  if (a.coin.native !== b.coin.native) return a.coin.native ? -1 : 1;

  return a.coin.network.localeCompare(b.coin.network);
}
