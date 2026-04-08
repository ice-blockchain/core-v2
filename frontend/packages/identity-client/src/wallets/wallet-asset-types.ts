export interface Wallet {
  id: string;
  network: string;
  status: string | null;
  signingKey: WalletSigningKey;
  address: string | null;
  name: string | null;
}

export interface WalletSigningKey {
  scheme: string;
  curve: string;
  publicKey: string;
  id: string;
}

export interface CreateWalletInput {
  network: string;
  name: string;
}

export interface RestrictedRegionDetails {
  country: string;
  city: string;
  region: string;
  regionCode: string;
}

export interface WalletAssetBase {
  kind: string;
  decimals: number;
  balance: string;
}

export interface NativeAsset extends WalletAssetBase { kind: 'Native'; symbol?: string; contract?: string; verified?: boolean; name?: string }
export interface Erc20Asset extends WalletAssetBase { kind: 'Erc20'; symbol?: string; contract?: string; verified?: boolean; name?: string }
export interface AsaAsset extends WalletAssetBase { kind: 'Asa'; assetId: string; verified: boolean; symbol?: string; name?: string }
export interface SplAsset extends WalletAssetBase { kind: 'Spl'; mint: string; symbol?: string; name?: string }
export interface Spl2022Asset extends WalletAssetBase { kind: 'Spl2022'; mint: string; symbol: string; name?: string }
export interface Sep41Asset extends WalletAssetBase { kind: 'Sep41'; issuer: string; assetCode: string; symbol: string; name?: string }
export interface Tep74Asset extends WalletAssetBase { kind: 'Tep74'; symbol: string; name?: string; master?: string }
export interface Trc10Asset extends WalletAssetBase { kind: 'Trc10'; tokenId: string; symbol: string; name?: string }
export interface Trc20Asset extends WalletAssetBase { kind: 'Trc20'; contract: string; symbol: string; name?: string }
export interface Aip21Asset extends WalletAssetBase { kind: 'Aip21'; metadata: string; symbol: string; name?: string }

export interface UnknownAsset extends WalletAssetBase {
  symbol?: string; contract?: string; master?: string; name?: string;
  assetId?: string; mint?: string; tokenId?: string; verified?: boolean;
}

export type WalletAsset =
  | NativeAsset | Erc20Asset | AsaAsset | SplAsset | Spl2022Asset
  | Sep41Asset | Tep74Asset | Trc10Asset | Trc20Asset | Aip21Asset | UnknownAsset;

export interface WalletNft {
  kind: string;
  contract: string;
  symbol: string;
  tokenId: string;
  tokenUri: string;
  description: string;
  name: string;
  network: string;
  collectionImageUri: string;
  walletId: string | null;
}

export interface WalletHistoryItem {
  walletId: string;
  network: string;
  kind: string;
  direction: string;
  blockNumber: number;
  timestamp: string;
  txHash: string;
  from: string | null;
  to: string | null;
  value: string | null;
  fee: string | null;
  metadata: {
    asset: { symbol: string; decimals: number; verified: boolean };
    fee: { symbol: string; decimals: number; verified: boolean };
  };
}
