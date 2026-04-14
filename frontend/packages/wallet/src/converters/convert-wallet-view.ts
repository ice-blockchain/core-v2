import type { WalletViewDetail, WalletViewCoin } from "@ion/identity-client";
import type {
  CoinDisplayInfo,
  CoinWithBalance,
  CoinsGroup,
  WalletViewData,
} from "../types";
import { fromBlockchainUnits } from "./from-blockchain-units";
import { extractContractAddress } from "./extract-contract-address";
import { searchAggregationItem, buildAggregationWalletKey } from "./search-aggregation-item";
import { compareGroups } from "./compare-coin-groups";
import { compareCoins } from "./compare-coins";

function isValidCoin(coin: WalletViewCoin): boolean {
  return coin.id !== "" && coin.decimals > 0 && coin.symbol !== "" && coin.symbolGroup !== "";
}

function buildCoinDisplayInfo(coin: WalletViewCoin): CoinDisplayInfo {
  return {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    symbolGroup: coin.symbolGroup,
    network: coin.network,
    contractAddress: coin.contractAddress,
    decimals: coin.decimals,
    priceUSD: coin.priceUSD,
    iconURL: coin.iconURL,
    native: coin.native,
    prioritized: coin.prioritized,
  };
}

interface MatchedBalance {
  amount: number;
  rawAmount: string;
  balanceUSD: number;
  walletId: string | null;
  walletAssetContractAddress: string | null;
}

function calculateMatchedBalance(
  coin: WalletViewCoin,
  detail: WalletViewDetail,
  consumed: Set<string>,
): MatchedBalance {
  const result = searchAggregationItem(coin, detail.aggregation);
  if (!result) {
    return { amount: 0, rawAmount: "0", balanceUSD: 0, walletId: null, walletAssetContractAddress: null };
  }

  const key = buildAggregationWalletKey(result.wallet);
  const isConsumed = consumed.has(key);
  if (!isConsumed) consumed.add(key);

  const amount = isConsumed ? 0 : fromBlockchainUnits(result.wallet.asset.balance, result.wallet.asset.decimals);
  const rawAmount = isConsumed ? "0" : result.wallet.asset.balance;
  const assetContract = extractContractAddress(result.wallet.asset);
  const parsedPrice = parseFloat(coin.priceUSD ?? "");
  const safePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;

  return {
    amount,
    rawAmount,
    balanceUSD: amount * safePrice,
    walletId: result.wallet.walletId,
    walletAssetContractAddress: assetContract && assetContract !== coin.contractAddress ? assetContract : null,
  };
}

function processCoin(
  coin: WalletViewCoin,
  detail: WalletViewDetail,
  consumed: Set<string>,
): CoinWithBalance {
  const matched = calculateMatchedBalance(coin, detail, consumed);
  return {
    coin: buildCoinDisplayInfo(coin),
    amount: matched.amount,
    rawAmount: matched.rawAmount,
    balanceUSD: matched.balanceUSD,
    walletId: matched.walletId,
    walletAssetContractAddress: matched.walletAssetContractAddress,
  };
}

function addCoinToGroup(groups: Map<string, CoinsGroup>, coinWithBalance: CoinWithBalance): void {
  const { symbolGroup } = coinWithBalance.coin;
  const existing = groups.get(symbolGroup);

  if (existing) {
    existing.coins.push(coinWithBalance);
    existing.totalAmount += coinWithBalance.amount;
    existing.totalBalanceUSD += coinWithBalance.balanceUSD;
  } else {
    groups.set(symbolGroup, {
      name: coinWithBalance.coin.name,
      symbolGroup,
      abbreviation: coinWithBalance.coin.symbol.toUpperCase(),
      iconURL: coinWithBalance.coin.iconURL || null,
      coins: [coinWithBalance],
      totalAmount: coinWithBalance.amount,
      totalBalanceUSD: coinWithBalance.balanceUSD,
    });
  }
}

export function convertWalletView(detail: WalletViewDetail): WalletViewData {
  const groups = new Map<string, CoinsGroup>();
  const consumed = new Set<string>();
  let totalUsdBalance = 0;
  const safeDetail = { ...detail, aggregation: detail.aggregation ?? {} };

  for (const coin of safeDetail.coins) {
    if (!isValidCoin(coin)) {
      continue;
    }
    const coinWithBalance = processCoin(coin, safeDetail, consumed);
    totalUsdBalance += coinWithBalance.balanceUSD;
    addCoinToGroup(groups, coinWithBalance);
  }

  const coinGroups = Array.from(groups.values());
  for (const group of coinGroups) {
    group.coins.sort(compareCoins);
  }
  coinGroups.sort(compareGroups);

  return {
    id: detail.id,
    name: detail.name,
    coinGroups,
    symbolGroups: new Set(detail.symbolGroups),
    usdBalance: totalUsdBalance,
    isMainWalletView: false,
  };
}
