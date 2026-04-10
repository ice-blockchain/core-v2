import type {
  WalletViewAggregationWallet,
  WalletViewCoin,
  SymbolGroupBalance,
} from '@ion/identity-client';
import {extractContractAddress} from './extract-contract-address';

export function isMatchingWallet(
  wallet: WalletViewAggregationWallet,
  coin: WalletViewCoin,
): boolean {
  if (wallet.walletId !== coin.walletId) {
    return false;
  }

  const contract = extractContractAddress(wallet.asset);
  if (
    contract &&
    coin.contractAddress &&
    contract.toLowerCase() === coin.contractAddress.toLowerCase()
  ) {
    return true;
  }

  return wallet.coinId === null || wallet.coinId === coin.id;
}

function findMatchingItem(
  coin: WalletViewCoin,
  aggregation: Record<string, SymbolGroupBalance>,
): SymbolGroupBalance | null {
  const symbolKey = coin.symbol.toLowerCase();
  const directItem = aggregation[symbolKey];

  if (directItem) {
    const hasMatch = directItem.wallets.some(
      (wallet) =>
        isMatchingWallet(wallet, coin) && wallet.network === coin.network,
    );
    if (hasMatch) {
      return directItem;
    }
  }

  for (const item of Object.values(aggregation)) {
    const hasMatch = item.wallets.some(
      (wallet) =>
        isMatchingWallet(wallet, coin) && wallet.network === coin.network,
    );
    if (hasMatch) {
      return item;
    }
  }

  return null;
}

interface AggregationSearchResult {
  item: SymbolGroupBalance;
  wallet: WalletViewAggregationWallet;
}

export function searchAggregationItem(
  coin: WalletViewCoin,
  aggregation: Record<string, SymbolGroupBalance>,
): AggregationSearchResult | null {
  const item = findMatchingItem(coin, aggregation);
  if (!item) {
    return null;
  }

  const wallet = item.wallets.find(
    (w) => isMatchingWallet(w, coin) && w.network === coin.network,
  );
  if (!wallet) {
    return null;
  }

  return {item, wallet};
}

export function buildAggregationWalletKey(
  wallet: WalletViewAggregationWallet,
): string {
  const contract = extractContractAddress(wallet.asset);
  return `${wallet.walletId}|${wallet.network}|${contract ?? wallet.coinId}`;
}
