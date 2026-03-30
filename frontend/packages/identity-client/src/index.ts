export type {
  IdentityClient,
  IdentityClientConfig,
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
} from './types';

export { IdentityError, IdentityErrorCode } from './errors';

export { createIdentityClient } from './create-identity-client';

export { isPasskeyAvailable } from './platform/passkey';
