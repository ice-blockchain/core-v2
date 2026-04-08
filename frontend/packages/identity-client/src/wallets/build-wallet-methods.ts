import type { HttpClient } from '@ion/network';
import type { TokenManager } from '../token/token-manager';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { WalletsDataSource } from '../data-sources/wallets-data-source';
import type { WalletViewsDataSource } from '../data-sources/wallet-views-data-source';
import type { NetworksDataSource } from '../data-sources/networks-data-source';
import type { SigningContext } from '../types';
import type {
  CreateWalletInput, TransferRequest, EvmBroadcastRequest,
  GenerateSignatureRequest, CallFunctionRequest, WalletViewInput,
  PaginationParams, EstimateFee, FeeLevel,
} from './types';
import { listWallets, getWalletAssets, getWalletNfts, createWallet, probeRestrictedRegion } from './wallets';
import { getWalletHistory, getWalletTransfers, getTransferById } from './wallet-history';
import { makeTransfer } from './make-transfer';
import { signAndBroadcastEvm } from './sign-and-broadcast-evm';
import { generateSignature } from './generate-signature';
import { signMessageTon } from './sign-message-ton';
import { callFunction } from './call-function';
import {
  listWalletViews, createWalletView, getWalletView, updateWalletView, deleteWalletView,
} from './wallet-views';

interface WalletContext {
  httpClient: HttpClient;
  tokenManager: TokenManager;
  origin: string;
  userActionDataSource: UserActionDataSource;
  walletsDataSource: WalletsDataSource;
  walletViewsDataSource: WalletViewsDataSource;
  networksDataSource: NetworksDataSource;
}

interface ReadDeps { walletsDataSource: WalletsDataSource }
interface WriteDeps { userActionDataSource: UserActionDataSource; httpClient: HttpClient; origin: string }
interface ViewDeps { walletViewsDataSource: WalletViewsDataSource; tokenManager: TokenManager }

function normalizeFeeValue(value: unknown): string {
  if (value === null || value === undefined) return '0';
  return String(value);
}

function normalizeFeeLevel(level: FeeLevel): FeeLevel {
  return {
    maxFeePerGas: normalizeFeeValue(level.maxFeePerGas),
    maxPriorityFeePerGas: normalizeFeeValue(level.maxPriorityFeePerGas),
    feeRate: level.feeRate === null ? null : normalizeFeeValue(level.feeRate),
    waitTime: level.waitTime,
  };
}

function normalizeFee(fee: EstimateFee): EstimateFee {
  return {
    ...fee,
    fast: normalizeFeeLevel(fee.fast),
    standard: normalizeFeeLevel(fee.standard),
    slow: normalizeFeeLevel(fee.slow),
  };
}

function buildWalletReadMethods(readDeps: ReadDeps, writeDeps: WriteDeps) {
  return {
    listWallets: (username: string) => listWallets(username, readDeps),
    getWalletAssets: (username: string, walletId: string) => getWalletAssets(username, walletId, readDeps),
    getWalletNfts: (username: string, walletId: string) => getWalletNfts(username, walletId, readDeps),
    createWallet: (username: string, input: CreateWalletInput, signingContext: SigningContext) =>
      createWallet({ username, input, signingContext }, writeDeps),
    probeRestrictedRegion: () => probeRestrictedRegion(readDeps),
  };
}

function buildHistoryMethods(readDeps: ReadDeps, writeDeps: WriteDeps) {
  return {
    getWalletHistory: (username: string, walletId: string, params?: PaginationParams) =>
      getWalletHistory({ username, walletId, params }, readDeps),
    getWalletTransfers: (username: string, walletId: string, params?: PaginationParams) =>
      getWalletTransfers({ username, walletId, params }, readDeps),
    getTransferById: (username: string, walletId: string, transferId: string) =>
      getTransferById({ username, walletId, transferId }, readDeps),
    makeTransfer: (params: { username: string; walletId: string; transfer: TransferRequest; signingContext: SigningContext }) =>
      makeTransfer(params, writeDeps),
  };
}

function buildViewMethods(viewDeps: ViewDeps) {
  return {
    listWalletViews: (username: string) => listWalletViews(username, viewDeps),
    createWalletView: async (username: string, input: WalletViewInput) => {
      const detail = await createWalletView(username, input, viewDeps);
      return { ...detail, nextPageToken: null };
    },
    getWalletView: (username: string, walletViewId: string, params?: PaginationParams) =>
      getWalletView(username, { walletViewId, params }, viewDeps),
    updateWalletView: async (username: string, walletViewId: string, input: WalletViewInput) => {
      const detail = await updateWalletView(username, { walletViewId, input }, viewDeps);
      return { ...detail, nextPageToken: null };
    },
    deleteWalletView: (username: string, walletViewId: string) => deleteWalletView(username, walletViewId, viewDeps),
  };
}

function buildSigningMethods(readDeps: ReadDeps, writeDeps: WriteDeps) {
  return {
    signAndBroadcastEvm: (params: { username: string; walletId: string; request: EvmBroadcastRequest; signingContext: SigningContext }) =>
      signAndBroadcastEvm(params, writeDeps),
    generateSignature: (params: { username: string; walletId: string; request: GenerateSignatureRequest; signingContext: SigningContext }) =>
      generateSignature(params, writeDeps),
    callFunction: (username: string, network: string, request: CallFunctionRequest) =>
      callFunction({ username, network, request }, readDeps),
    signMessageTon: (params: { username: string; signingKeyId: string; message: string; signingContext: SigningContext }) =>
      signMessageTon(params, writeDeps),
  };
}

export function buildWalletMethods(c: WalletContext) {
  const readDeps = { walletsDataSource: c.walletsDataSource };
  const writeDeps = { userActionDataSource: c.userActionDataSource, httpClient: c.httpClient, origin: c.origin };
  const viewDeps = { walletViewsDataSource: c.walletViewsDataSource, tokenManager: c.tokenManager };

  return {
    ...buildWalletReadMethods(readDeps, writeDeps),
    ...buildHistoryMethods(readDeps, writeDeps),
    ...buildViewMethods(viewDeps),
    ...buildSigningMethods(readDeps, writeDeps),
    getEstimateFees: async (username: string, networks: string[]) => {
      const fees = await c.networksDataSource.estimateFees(networks, username);
      return fees.map(normalizeFee);
    },
  };
}
