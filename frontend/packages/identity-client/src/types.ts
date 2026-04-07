import type { Interceptor } from '@ion/network';
import type { ISecureStorage } from '@ion/storage';
import type {
  SocialProfile,
  UpdateSocialProfileInput,
  UpdateSocialProfileResult,
} from './users/types';

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
  authStore: AuthStore;
}

export interface AuthStore {
  getSnapshot(): readonly string[];
  subscribe(onStoreChange: () => void): () => void;
}

export interface LoginCapabilities {
  supportsPasskey: boolean;
  supportsPassword: boolean;
  identityFound: boolean;
  twoFAOptionsCount: number | null;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface UserRegistrationChallenge {
  temporaryAuthenticationToken: string | null;
  rp: RelyingParty;
  user: UserInformation;
  challenge: string;
  challengeIdentifier: string;
  attestation: string;
  pubKeyCredParams: PublicKeyCredentialParam[];
  excludeCredentials: CredentialDescriptor[];
  authenticatorSelection: AuthenticatorSelectionCriteria | null;
  supportedCredentialKinds: SupportedCredentialKinds | null;
  allowedRecoveryCredentials: AllowedRecoveryCredential[] | null;
}

export interface UserActionChallenge {
  challenge: string;
  challengeIdentifier: string;
  rp: RelyingParty;
  allowCredentials: AllowCredentials;
  supportedCredentialKinds: SupportedCredentialKind[];
  attestation: string;
  userVerification: string;
  externalAuthenticationUrl: string;
}

export interface RelyingParty {
  id: string;
  name: string;
}

export interface UserInformation {
  id: string;
  name: string;
  displayName: string;
}

export interface PublicKeyCredentialParam {
  type: string;
  alg: number;
}

export interface CredentialDescriptor {
  type: string;
  id: string;
  encryptedPrivateKey?: string;
}

export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: string;
  residentKey?: string;
  requireResidentKey?: boolean;
  userVerification?: string;
}

export interface SupportedCredentialKinds {
  firstFactor: string[];
  secondFactor: string[];
}

export interface SupportedCredentialKind {
  kind: string;
  factor: string;
  requiresSecondFactor: boolean;
}

export interface AllowCredentials {
  webauthn: CredentialDescriptor[] | null;
  passwordProtectedKey: CredentialDescriptor[] | null;
}

export interface AllowedRecoveryCredential {
  id: string;
  encryptedRecoveryKey: string;
}

export interface RegistrationResult {
  authentication: AuthTokens;
  user: { id: string };
}

export interface RecoveryResult {
  credential: { uuid: string; kind: string; name: string };
  user: { id: string };
}

export interface PasskeyRegistrationResult {
  credentialId: string;
  clientDataJSON: string;
  attestationObject: string;
}

export interface PasskeyAuthResult {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string | null;
}

export type TwoFAOption = 'sms' | 'email' | 'totp_authenticator';

// Signing context (used by User Action Signing)
export interface PasswordSigningContext {
  kind: 'password';
  password: string;
}

export interface PasskeySigningContext {
  kind: 'passkey';
}

export type SigningContext = PasswordSigningContext | PasskeySigningContext;

// Credentials
export interface CredentialListItem {
  uuid: string | null;
  kind: string;
  name: string;
}

export interface RecoveryCredentialsResult {
  identityKeyName: string;
  recoveryKeyId: string;
  recoveryCode: string;
}

// 2FA
export interface RequestTwoFAInput {
  '2FAVerificationCodes'?: Record<string, string>;
  email?: string;
  phoneNumber?: string;
  replace?: string;
}

export type RequestTwoFAResponse = { TOTPAuthenticatorURL: string } | Record<string, never>;

export interface TwoFAVerificationParam {
  twoFAOptionVerificationValue: string;
  twoFAOptionVerificationCode: string;
}

export interface RequestTwoFACodeParams {
  username: string;
  userId: string;
  twoFAOption: string;
  input: RequestTwoFAInput;
  signingContext: SigningContext;
}

export interface VerifyTwoFACodeParams {
  username: string;
  userId: string;
  twoFAOption: string;
  code: string;
  signingContext: SigningContext;
}

export interface DeleteTwoFAMethodInput {
  username: string;
  userId: string;
  twoFAOption: string;
  twoFAValue: string;
  verificationParams: TwoFAVerificationParam[];
  signingContext: SigningContext;
}

// Recovery
export interface PasswordRecoveryInput {
  username: string;
  recoveryCode: string;
  credentialId: string;
  newCredentialKind: 'PasswordProtectedKey';
  newPassword: string;
  twoFAVerificationCodes?: Record<string, string>;
}

export interface PasskeyRecoveryInput {
  username: string;
  recoveryCode: string;
  credentialId: string;
  newCredentialKind: 'Fido2';
  twoFAVerificationCodes?: Record<string, string>;
}

export type RecoverAccountInput = PasswordRecoveryInput | PasskeyRecoveryInput;

export interface UserAssignedRelay {
  type: string;
  url: string;
}

export interface User {
  '2faOptions': TwoFAOption[] | null;
  duplicateOf: string | null;
  email: string[] | null;
  ionConnectIndexerRelays: string[] | null;
  ionConnectRelays: UserAssignedRelay[] | null;
  masterPubKey: string;
  phoneNumber: string[] | null;
}
