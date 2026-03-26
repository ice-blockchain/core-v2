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
} from './src/types';

export { IdentityError, IdentityErrorCode } from './src/errors';

export { createIdentityClient } from './src/create-identity-client';
