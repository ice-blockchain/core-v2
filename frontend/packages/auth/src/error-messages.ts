import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import type { AuthFlowError } from './types';

const ERROR_MESSAGES: Record<IdentityErrorCode, string> = {
  [IdentityErrorCode.USER_NOT_FOUND]: 'Account not found. Check your identity key name.',
  [IdentityErrorCode.USER_ALREADY_EXISTS]: 'This identity key is already taken.',
  [IdentityErrorCode.INVALID_CREDENTIALS]: 'Incorrect password. Try again.',
  [IdentityErrorCode.PASSKEY_CANCELLED]: 'Passkey verification was cancelled.',
  [IdentityErrorCode.PASSKEY_NOT_AVAILABLE]: 'Passkey is not available on this device.',
  [IdentityErrorCode.PASSKEY_VALIDATION_FAILED]: 'Passkey validation failed. Try again.',
  [IdentityErrorCode.NETWORK_ERROR]: 'Connection failed. Check your internet and try again.',
  [IdentityErrorCode.USER_DEACTIVATED]: 'This account has been deactivated.',
  [IdentityErrorCode.TOKEN_EXPIRED]: 'Session expired. Please sign in again.',
  [IdentityErrorCode.UNAUTHENTICATED]: 'Authentication required. Please sign in.',
  [IdentityErrorCode.UNKNOWN]: 'Something went wrong. Please try again.',
};

export function mapIdentityError(error: unknown): AuthFlowError {
  if (error instanceof IdentityError) {
    return { code: error.code, userMessage: ERROR_MESSAGES[error.code] };
  }
  return { code: 'UNKNOWN', userMessage: ERROR_MESSAGES[IdentityErrorCode.UNKNOWN] };
}
