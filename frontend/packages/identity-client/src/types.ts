import type { HttpClient } from '@ion/network';
import type { ISecureStorage } from '@ion/storage';

export interface IdentityClientConfig {
  httpClient: HttpClient;
  secureStorage: ISecureStorage;
  appId: string;
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
  getLoginCapabilities(username: string): Promise<LoginCapabilities>;
  getUser(username: string, userIdOrMasterKey: string): Promise<User>;
}

export interface LoginCapabilities {
  supportsPasskey: boolean;
  supportsPassword: boolean;
  identityFound: boolean;
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
