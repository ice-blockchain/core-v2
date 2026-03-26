export type {
  IdentityClient,
  IdentityClientConfig,
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
