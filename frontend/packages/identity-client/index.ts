export type {
  IdentityClient,
  IdentityClientConfig,
  LoginCapabilities,
  UserRegistrationChallenge,
  UserActionChallenge,
  RegistrationResult,
  AuthTokens,
} from './src/types';

export { IdentityError, IdentityErrorCode } from './src/errors';

export { createIdentityClient } from './src/create-identity-client';
