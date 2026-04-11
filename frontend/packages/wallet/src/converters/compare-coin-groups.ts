import type { CoinsGroup } from '../types';
import { compareBySortRules } from './coin-sort-utils';

function hasAnyPrioritized(group: CoinsGroup): boolean {
  return group.coins.some((coin) => coin.coin.prioritized);
}

export function compareGroups(a: CoinsGroup, b: CoinsGroup): number {
  return compareBySortRules(
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
