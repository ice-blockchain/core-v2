import type { WalletAsset, WalletNft } from './wallet-asset-types';

export interface WalletViewCoinRef {
  coinId: string;
  walletId: string | null;
}

export interface WalletViewSummary {
  id: string;
  name: string;
  coins: WalletViewCoinRef[];
  symbolGroups: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface WalletViewInput {
  name: string;
  items: WalletViewCoinRef[];
  symbolGroups: string[];
}

export interface WalletViewCoin {
  walletId: string | null;
  id: string;
  name: string;
  symbol: string;
  symbolGroup: string;
  network: string;
  contractAddress: string;
  decimals: number;
  priceUSD: string;
  iconURL: string;
  syncFrequency: number;
  native: boolean;
  prioritized: boolean;
}

export interface WalletViewAggregationWallet {
  asset: WalletAsset;
  walletId: string;
  network: string;
  coinId: string | null;
}

export interface SymbolGroupBalance {
  wallets: WalletViewAggregationWallet[];
  totalBalance: string;
}

export interface WalletViewDetail {
  id: string;
  name: string;
  coins: WalletViewCoin[];
  aggregation: Record<string, SymbolGroupBalance>;
  symbolGroups: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  nfts: WalletNft[] | null;
}

export interface FeeLevel {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  feeRate: string | null;
  waitTime: number;
}

export interface EstimateFee {
  network: string;
  estimatedBaseFee: number;
  kind: string | null;
  fast: FeeLevel;
  standard: FeeLevel;
  slow: FeeLevel;
}

export interface PaginationParams {
  limit?: number;
  paginationToken?: string;
}
