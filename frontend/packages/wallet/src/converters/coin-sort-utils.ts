const PRIORITY_LIST = [
  'ion', 'binancecoin', 'bitcoin', 'ethereum', 'solana',
  'the-open-network', 'dogecoin', 'litecoin', 'stellar', 'tron',
  'ripple', 'tezos', 'matic-network', 'polkadot', 'optimism',
  'cardano', 'algorand', 'kusama', 'avalanche-2', 'kaspa',
  'arbitrum', 'token-s', 'aptos',
];

export const LOW_BALANCE_ICE_THRESHOLD = 0.01;

export interface CompareInput {
  symbolGroup: string;
  totalBalanceUSD: number;
  isPrioritized: boolean;
}

export function compareBySortRules(a: CompareInput, b: CompareInput): number {
  const aIsIon = a.symbolGroup.toLowerCase() === 'ion';
  const bIsIon = b.symbolGroup.toLowerCase() === 'ion';
  if (aIsIon !== bIsIon) return aIsIon ? -1 : 1;

  const aIsLowIce = isLowBalanceIce(a);
  const bIsLowIce = isLowBalanceIce(b);
  if (aIsLowIce !== bIsLowIce) return aIsLowIce ? 1 : -1;

  if (a.totalBalanceUSD !== b.totalBalanceUSD) return b.totalBalanceUSD - a.totalBalanceUSD;

  if (a.isPrioritized !== b.isPrioritized) return a.isPrioritized ? -1 : 1;

  const aPriority = getPriorityIndex(a.symbolGroup);
  const bPriority = getPriorityIndex(b.symbolGroup);
  if (aPriority !== bPriority) return aPriority - bPriority;

  return a.symbolGroup.toLowerCase().localeCompare(b.symbolGroup.toLowerCase());
}

function isLowBalanceIce(input: CompareInput): boolean {
  return input.symbolGroup.toLowerCase() === 'ice' && input.totalBalanceUSD < LOW_BALANCE_ICE_THRESHOLD;
}

function getPriorityIndex(symbolGroup: string): number {
  const index = PRIORITY_LIST.indexOf(symbolGroup.toLowerCase());
  return index === -1 ? PRIORITY_LIST.length : index;
}
