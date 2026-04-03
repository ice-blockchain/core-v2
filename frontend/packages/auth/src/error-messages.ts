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
  [IdentityErrorCode.RESTRICTED_REGION]: 'auth:errorRestrictedRegion',
  [IdentityErrorCode.TWO_FA_REQUIRED]: 'auth:errorTwoFARequired',
  [IdentityErrorCode.INVALID_TWO_FA_CODE]: 'auth:errorInvalidTwoFACode',
  [IdentityErrorCode.TWO_FA_NOT_CONFIGURED]: 'auth:errorTwoFANotConfigured',
  [IdentityErrorCode.INVALID_NICKNAME]: 'auth:errorInvalidNickname',
  [IdentityErrorCode.NICKNAME_ALREADY_EXISTS]: 'auth:errorNicknameAlreadyExists',
  [IdentityErrorCode.NICKNAME_RESERVED]: 'auth:errorNicknameReserved',
  [IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS]: 'auth:errorInvalidRecoveryCredentials',
  [IdentityErrorCode.INVALID_SIGNATURE]: 'auth:errorInvalidSignature',
  [IdentityErrorCode.INVALID_EMAIL]: 'auth:errorInvalidEmail',
  [IdentityErrorCode.PASSWORD_FLOW_NOT_AVAILABLE]: 'auth:errorPasswordFlowNotAvailable',
  [IdentityErrorCode.WALLET_NOT_FOUND]: 'auth:errorWalletNotFound',
  [IdentityErrorCode.UNKNOWN]: 'auth:errorUnknown',
};

export function mapIdentityError(error: unknown): AuthFlowError {
  if (error instanceof IdentityError) {
    return { code: error.code, userMessage: translate(ERROR_KEYS[error.code]) };
  }
  return { code: 'UNKNOWN', userMessage: translate(ERROR_KEYS[IdentityErrorCode.UNKNOWN]) };
}
