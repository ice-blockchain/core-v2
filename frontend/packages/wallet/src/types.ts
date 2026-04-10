import type { WalletViewCoinRef } from "@ion/identity-client";

export interface CoinDisplayInfo {
  id: string;
  name: string;
  symbol: string;
  symbolGroup: string;
  network: string;
  contractAddress: string;
  decimals: number;
  priceUSD: string;
  iconURL: string;
  native: boolean;
  prioritized: boolean;
}

export interface CoinWithBalance {
  coin: CoinDisplayInfo;
  amount: number;
  rawAmount: string;
  balanceUSD: number;
  walletId: string | null;
  walletAssetContractAddress: string | null;
}

export interface CoinsGroup {
  name: string;
  symbolGroup: string;
  abbreviation: string;
  iconURL: string | null;
  coins: CoinWithBalance[];
  totalAmount: number;
  totalBalanceUSD: number;
}

export interface WalletViewData {
  id: string;
  name: string;
  coinGroups: CoinsGroup[];
  symbolGroups: Set<string>;
  usdBalance: number;
  isMainWalletView: boolean;
}

export interface WalletView {
  id: string;
  name: string;
  balance: string;
  isMain: boolean;
  coinGroups: readonly CoinsGroup[];
  isLoading: boolean;
  serverId: string | null;
  originalItems: readonly WalletViewCoinRef[];
  originalSymbolGroups: readonly string[];
}

export interface WalletViewStore {
  getWalletViews: () => readonly WalletView[];
  getActiveWalletViewId: () => string;
  subscribe: (listener: () => void) => () => void;
}
