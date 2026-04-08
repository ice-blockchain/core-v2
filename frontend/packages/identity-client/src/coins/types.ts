export interface Coin {
  id: string;
  name: string;
  symbol: string;
  symbolGroup: string;
  network: string;
  contractAddress: string;
  decimals: number;
  priceUSD: number;
  iconURL: string;
  syncFrequency: number;
  native: boolean;
  prioritized: boolean;
  tokenizedCommunityExternalAddress?: string | null;
  tokenizedCommunityTokenType?: string | null;
}

export interface CoinNetwork {
  id: string;
  displayName: string;
  explorerUrl: string;
  image: string;
  isTestnet: boolean;
  tier: number;
}

export interface CoinsResponse {
  coins: Coin[];
  networks: CoinNetwork[];
  version: number;
}
