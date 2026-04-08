// Wallet core types

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

// Wallet assets

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

// Wallet NFTs

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

// Wallet history

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

// Transfer types

export interface Requester {
  userId: string;
  tokenId: string | null;
  appId: string | null;
}

export interface WalletTransferRequest {
  id: string;
  walletId: string;
  network: string;
  requester: Requester;
  requestBody: Record<string, unknown>;
  status: 'Pending' | 'Broadcasted' | 'Confirmed' | 'Failed';
  dateRequested: string;
  txHash: string | null;
  fee: string | null;
  dateBroadcasted: string | null;
  dateConfirmed: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}

export type TransferPriority = 'Slow' | 'Standard' | 'Fast';

export type TransferRequest =
  | { kind: 'Native'; to: string; amount: string; priority?: TransferPriority; memo?: string; createDestinationAccount?: boolean }
  | { kind: 'Erc20'; contract: string; to: string; amount: string; priority?: TransferPriority }
  | { kind: 'Erc721'; contract: string; to: string; tokenId: string; priority?: TransferPriority }
  | { kind: 'Asa'; assetId: string; to: string; amount: string }
  | { kind: 'Spl'; mint: string; to: string; amount: string; createDestinationAccount?: boolean }
  | { kind: 'Spl2022'; mint: string; to: string; amount: string; createDestinationAccount?: boolean }
  | { kind: 'Sep41'; issuer: string; assetCode: string; to: string; amount: string; memo?: string; createDestinationAccount?: boolean }
  | { kind: 'Tep74'; to: string; amount: string; master?: string }
  | { kind: 'Trc10'; tokenId: string; to: string; amount: string }
  | { kind: 'Trc20'; contract: string; to: string; amount: string }
  | { kind: 'Trc721'; contract: string; to: string; tokenId: string }
  | { kind: 'Aip21'; metadata: string; to: string; amount: string }
  | { kind: 'Eip1559'; to: string; data: string; value: string; maxFeePerGas: string; maxPriorityFeePerGas: string };

// EVM types

export interface EvmTransactionJson {
  to: string;
  type: number;
  value: string;
  data: string;
  nonce: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  authorizationList?: EvmAuthorizationEntry[];
}

export interface EvmAuthorizationEntry {
  chainId: number;
  address: string;
  nonce: number;
  signature: string;
}

export interface EvmUserOperation {
  to: string;
  value: string;
  data: string;
}

export type EvmBroadcastRequest =
  | { kind: 'Transaction'; transaction: string | EvmTransactionJson; externalId?: string }
  | { kind: 'UserOperations'; userOperations: EvmUserOperation[]; feeSponsorId: string };

// Signature types

export type GenerateSignatureRequest =
  | { kind: 'Hash'; hash: string; externalId?: string }
  | { kind: 'Message'; message: string; externalId?: string };

export interface GenerateSignatureResponse {
  id: string;
  keyId: string;
  requester: Requester;
  requestBody: Record<string, unknown>;
  status: string;
  signature: Record<string, unknown>;
  dateRequested: string;
  dateSigned: string;
}

// Call function types

export interface AbiParam {
  name: string;
  type: string;
  components?: AbiParam[];
}

export interface AbiFunction {
  type: 'function';
  name: string;
  stateMutability: string;
  inputs: AbiParam[];
  outputs: AbiParam[];
}

export interface CallFunctionRequest {
  contract: string;
  abi: AbiFunction;
  calldata: Record<string, unknown>;
}

// TON types

export interface TonSignMessageRequest {
  blockchainKind: 'Ton';
  kind: 'Message';
  message: string;
}

// Wallet view types

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
  priceUSD: number;
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

// Network fee types

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

// Pagination

export interface PaginationParams {
  limit?: number;
  paginationToken?: string;
}
