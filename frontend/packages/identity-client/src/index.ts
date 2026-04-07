export type {
  IdentityClient,
  IdentityClientConfig,
  AuthStore,
  PasswordRegistrationInput,
  PasswordLoginInput,
  LoginCapabilities,
  UserRegistrationChallenge,
  UserActionChallenge,
  RegistrationResult,
  AuthTokens,
  User,
  UserAssignedRelay,
  TwoFAOption,
  SigningContext,
  PasswordSigningContext,
  PasskeySigningContext,
  CredentialListItem,
  RecoveryCredentialsResult,
  RequestTwoFAInput,
  RequestTwoFAResponse,
  TwoFAVerificationParam,
  RequestTwoFACodeParams,
  VerifyTwoFACodeParams,
  DeleteTwoFAMethodInput,
  RecoverAccountInput,
  MakeTransferParams,
  SignAndBroadcastEvmParams,
  GenerateSignatureParams,
  SignMessageTonParams,
  UpdateKeyParams,
  DeriveKeyParams,
} from './types';

export type {
  SocialProfile,
  UpdateSocialProfileInput,
  UpdateSocialProfileResult,
} from './users/types';

// Wallet types
export type {
  Wallet, WalletSigningKey, WalletAsset, WalletNft,
  WalletHistoryItem, WalletTransferRequest, Requester, TransferRequest, TransferPriority,
  WalletViewSummary, WalletViewDetail, WalletViewInput, WalletViewCoinRef, WalletViewCoin, SymbolGroupBalance,
  EvmBroadcastRequest, GenerateSignatureRequest, GenerateSignatureResponse,
  EstimateFee, FeeLevel, CreateWalletInput, RestrictedRegionDetails,
  CallFunctionRequest, CallFunctionResponse, AbiFunction, AbiParam,
  PaginationParams,
} from './wallets/types';
export type { WalletViewDetailWithPagination } from './wallets/wallet-views';

// Coin types
export type { Coin, CoinNetwork, CoinsResponse } from './coins/types';

// Key types
export type { KeyResponse, ListKeysResponse, CreateKeyInput, DeriveKeyInput } from './keys/types';

export { IdentityError, IdentityErrorCode } from './errors';

export { mapNetworkError } from './map-network-error';

export { createIdentityClient } from './create-identity-client';

export { createDefaultIdentityClient } from './create-default-identity-client';

export { isPasskeyAvailable } from './platform/passkey';

export type { Pbkdf2Fn } from './crypto/encrypt-private-key';
