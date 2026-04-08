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

export interface CallFunctionResponse {
  result: string;
}

export interface TonSignMessageRequest {
  blockchainKind: 'Ton';
  kind: 'Message';
  message: string;
}
