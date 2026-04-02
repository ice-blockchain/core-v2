import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { translate } from '@ion/localization';
import type { AuthFlowError } from './types';

const ERROR_KEYS: Record<IdentityErrorCode, string> = {
  [IdentityErrorCode.USER_NOT_FOUND]: 'auth:errorUserNotFound',
  [IdentityErrorCode.USER_ALREADY_EXISTS]: 'auth:errorUserAlreadyExists',
  [IdentityErrorCode.INVALID_CREDENTIALS]: 'auth:errorInvalidCredentials',
  [IdentityErrorCode.PASSKEY_CANCELLED]: 'auth:errorPasskeyCancelled',
  [IdentityErrorCode.PASSKEY_NOT_AVAILABLE]: 'auth:errorPasskeyNotAvailable',
  [IdentityErrorCode.PASSKEY_VALIDATION_FAILED]: 'auth:errorPasskeyValidationFailed',
  [IdentityErrorCode.NETWORK_ERROR]: 'auth:errorNetworkError',
  [IdentityErrorCode.USER_DEACTIVATED]: 'auth:errorUserDeactivated',
  [IdentityErrorCode.TOKEN_EXPIRED]: 'auth:errorTokenExpired',
  [IdentityErrorCode.UNAUTHENTICATED]: 'auth:errorUnauthenticated',
  [IdentityErrorCode.UNKNOWN]: 'auth:errorUnknown',
};

export function mapIdentityError(error: unknown): AuthFlowError {
  if (error instanceof IdentityError) {
    return { code: error.code, userMessage: translate(ERROR_KEYS[error.code]) };
  }
  return { code: 'UNKNOWN', userMessage: translate(ERROR_KEYS[IdentityErrorCode.UNKNOWN]) };
}
