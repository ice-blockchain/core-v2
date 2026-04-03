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
} from './types';

export type {
  SocialProfile,
  UpdateSocialProfileInput,
  UpdateSocialProfileResult,
} from './users/types';

export { IdentityError, IdentityErrorCode } from './errors';

export { createIdentityClient } from './create-identity-client';

export { createDefaultIdentityClient } from './create-default-identity-client';

export { isPasskeyAvailable } from './platform/passkey';

export type { Pbkdf2Fn } from './crypto/encrypt-private-key';
