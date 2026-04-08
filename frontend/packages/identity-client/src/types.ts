import type { Interceptor } from '@ion/network';
import type { ISecureStorage } from '@ion/storage';
import type {
  SocialProfile,
  UpdateSocialProfileInput,
  UpdateSocialProfileResult,
} from './users/types';
import type {
  Wallet, CreateWalletInput, WalletAsset, WalletNft,
  WalletHistoryItem, WalletTransferRequest, TransferRequest,
  WalletViewSummary, WalletViewInput,
  EvmBroadcastRequest, GenerateSignatureRequest, GenerateSignatureResponse,
  CallFunctionRequest, CallFunctionResponse, EstimateFee, PaginationParams,
} from './wallets/types';
import type { WalletViewDetailWithPagination } from './wallets/wallet-views';
import type { Coin, CoinsResponse } from './coins/types';
import type { KeyResponse, ListKeysResponse, CreateKeyInput, DeriveKeyInput } from './keys/types';
import type {
  AuthStore, LoginCapabilities, SigningContext, CredentialListItem,
  RecoveryCredentialsResult, RequestTwoFACodeParams, RequestTwoFAResponse,
  VerifyTwoFACodeParams, DeleteTwoFAMethodInput, RecoverAccountInput, User,
} from './auth-types';

export type {
  AuthStore, LoginCapabilities,
  AuthTokens, UserRegistrationChallenge, UserActionChallenge,
  RelyingParty, UserInformation, PublicKeyCredentialParam,
  CredentialDescriptor, AuthenticatorSelectionCriteria,
  SupportedCredentialKinds, SupportedCredentialKind,
  AllowCredentials, AllowedRecoveryCredential,
  RegistrationResult, RecoveryResult,
  PasskeyRegistrationResult, PasskeyAuthResult,
  TwoFAOption, PasswordSigningContext, PasskeySigningContext, SigningContext,
  CredentialListItem, RecoveryCredentialsResult,
  RequestTwoFAInput, RequestTwoFAResponse, TwoFAVerificationParam,
  RequestTwoFACodeParams, VerifyTwoFACodeParams, DeleteTwoFAMethodInput,
  PasswordRecoveryInput, PasskeyRecoveryInput, RecoverAccountInput,
  UserAssignedRelay, User,
} from './auth-types';

export interface IdentityClientConfig {
  secureStorage: ISecureStorage;
  baseUrl: string;
  appId: string;
  nativePbkdf2?: (password: string, salt: Uint8Array, iterations: number, keyLength: number, hash: string) => Uint8Array;
  interceptors?: Interceptor[];
}

export interface PasswordRegistrationInput {
  username: string;
  password: string;
  earlyAccessEmail?: string | undefined;
}

export interface PasswordLoginInput {
  username: string;
  password: string;
  twoFAVerificationCodes?: Record<string, string> | undefined;
}

export interface MakeTransferParams { username: string; walletId: string; transfer: TransferRequest; signingContext: SigningContext }
export interface SignAndBroadcastEvmParams { username: string; walletId: string; request: EvmBroadcastRequest; signingContext: SigningContext }
export interface GenerateSignatureParams { username: string; walletId: string; request: GenerateSignatureRequest; signingContext: SigningContext }
export interface SignMessageTonParams { username: string; signingKeyId: string; message: string; signingContext: SigningContext }
export interface UpdateKeyParams { username: string; keyId: string; name: string; signingContext: SigningContext }
export interface DeriveKeyParams { username: string; keyId: string; input: DeriveKeyInput; signingContext: SigningContext }

export interface IdentityClient {
  registerWithPasskey(username: string, earlyAccessEmail?: string): Promise<void>;
  registerWithPassword(input: PasswordRegistrationInput): Promise<void>;
  loginWithPasskey(username: string, twoFAVerificationCodes?: Record<string, string>): Promise<string>;
  loginWithPassword(input: PasswordLoginInput): Promise<string>;
  logout(username: string): Promise<void>;
  refreshToken(username: string): Promise<void>;
  isAuthenticated(username: string): Promise<boolean>;
  restoreAuth(): Promise<void>;
  getLoginCapabilities(username: string): Promise<LoginCapabilities>;
  getUser(username: string, userIdOrMasterKey: string): Promise<User>;
  getSocialProfile(username: string, userIdOrMasterKey: string): Promise<SocialProfile>;
  updateSocialProfile(username: string, userId: string, input: UpdateSocialProfileInput): Promise<UpdateSocialProfileResult>;
  verifyNickname(username: string, nickname: string): Promise<void>;
  verifyEarlyAccessEmail(email: string): Promise<void>;
  listCredentials(username: string): Promise<CredentialListItem[]>;
  createRecoveryCredentials(username: string, signingContext: SigningContext): Promise<RecoveryCredentialsResult>;
  requestTwoFACode(params: RequestTwoFACodeParams): Promise<RequestTwoFAResponse>;
  verifyTwoFACode(params: VerifyTwoFACodeParams): Promise<void>;
  deleteTwoFAMethod(input: DeleteTwoFAMethodInput): Promise<void>;
  deleteAccount(username: string, userAction: string): Promise<void>;
  recoverAccount(input: RecoverAccountInput): Promise<void>;
  listWallets(username: string): Promise<Wallet[]>;
  getWalletAssets(username: string, walletId: string): Promise<{ walletId: string; network: string; assets: WalletAsset[] }>;
  getWalletNfts(username: string, walletId: string): Promise<WalletNft[]>;
  createWallet(username: string, input: CreateWalletInput, signingContext: SigningContext): Promise<Wallet>;
  probeRestrictedRegion(username: string): Promise<void>;
  getWalletHistory(username: string, walletId: string, params?: PaginationParams): Promise<{ items: WalletHistoryItem[]; nextPageToken: string | null }>;
  getWalletTransfers(username: string, walletId: string, params?: PaginationParams): Promise<{ walletId: string; items: WalletTransferRequest[]; nextPageToken: string | null }>;
  getTransferById(username: string, walletId: string, transferId: string): Promise<WalletTransferRequest>;
  makeTransfer(params: MakeTransferParams): Promise<WalletTransferRequest>;
  listWalletViews(username: string): Promise<WalletViewSummary[]>;
  createWalletView(username: string, input: WalletViewInput): Promise<WalletViewDetailWithPagination>;
  getWalletView(username: string, walletViewId: string, params?: PaginationParams): Promise<WalletViewDetailWithPagination>;
  updateWalletView(username: string, walletViewId: string, input: WalletViewInput): Promise<WalletViewDetailWithPagination>;
  deleteWalletView(username: string, walletViewId: string): Promise<void>;
  signAndBroadcastEvm(params: SignAndBroadcastEvmParams): Promise<WalletTransferRequest>;
  generateSignature(params: GenerateSignatureParams): Promise<GenerateSignatureResponse>;
  callFunction(username: string, network: string, request: CallFunctionRequest): Promise<CallFunctionResponse>;
  signMessageTon(params: SignMessageTonParams): Promise<GenerateSignatureResponse>;
  getCoins(username: string, version: number): Promise<CoinsResponse>;
  syncCoins(username: string, symbolGroups: string[]): Promise<Coin[]>;
  getCoinsBySymbolGroup(username: string, symbolGroup: string): Promise<Coin[]>;
  getCoinData(username: string, contractAddress: string, network: string): Promise<Coin>;
  searchCoins(username: string, keyword: string, params?: { limit?: number; offset?: number }): Promise<Coin[]>;
  getEstimateFees(username: string, networks: string[]): Promise<EstimateFee[]>;
  listKeys(username: string, params?: { owner?: string; limit?: number; paginationToken?: string }): Promise<ListKeysResponse>;
  createKey(username: string, input: CreateKeyInput, signingContext: SigningContext): Promise<KeyResponse>;
  deriveKey(params: DeriveKeyParams): Promise<{ output: string }>;
  updateKey(params: UpdateKeyParams): Promise<KeyResponse>;
  authStore: AuthStore;
}
