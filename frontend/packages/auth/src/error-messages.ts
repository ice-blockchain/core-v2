import { IdentityError, IdentityErrorCode, mapNetworkError } from '@ion/identity-client';
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
  [IdentityErrorCode.SERVER_ERROR]: 'auth:errorServerError',
  [IdentityErrorCode.UNKNOWN]: 'auth:errorUnknown',
};

const NUMERIC_ERROR_CODES: Record<IdentityErrorCode, number> = {
  [IdentityErrorCode.PASSKEY_NOT_AVAILABLE]: 101,
  [IdentityErrorCode.PASSKEY_CANCELLED]: 102,
  [IdentityErrorCode.PASSKEY_VALIDATION_FAILED]: 103,
  [IdentityErrorCode.INVALID_CREDENTIALS]: 201,
  [IdentityErrorCode.USER_NOT_FOUND]: 202,
  [IdentityErrorCode.USER_ALREADY_EXISTS]: 203,
  [IdentityErrorCode.USER_DEACTIVATED]: 204,
  [IdentityErrorCode.TOKEN_EXPIRED]: 205,
  [IdentityErrorCode.UNAUTHENTICATED]: 206,
  [IdentityErrorCode.PASSWORD_FLOW_NOT_AVAILABLE]: 207,
  [IdentityErrorCode.TWO_FA_REQUIRED]: 301,
  [IdentityErrorCode.INVALID_TWO_FA_CODE]: 302,
  [IdentityErrorCode.TWO_FA_NOT_CONFIGURED]: 303,
  [IdentityErrorCode.INVALID_NICKNAME]: 401,
  [IdentityErrorCode.NICKNAME_ALREADY_EXISTS]: 402,
  [IdentityErrorCode.NICKNAME_RESERVED]: 403,
  [IdentityErrorCode.INVALID_EMAIL]: 404,
  [IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS]: 501,
  [IdentityErrorCode.INVALID_SIGNATURE]: 502,
  [IdentityErrorCode.WALLET_NOT_FOUND]: 503,
  [IdentityErrorCode.UNKNOWN]: 600,
  [IdentityErrorCode.RESTRICTED_REGION]: 601,
  [IdentityErrorCode.SERVER_ERROR]: 700,
  [IdentityErrorCode.NETWORK_ERROR]: 701,
};

const DEFAULT_NUMERIC_CODE = 600;

export function mapIdentityError(error: unknown): AuthFlowError {
  const identityError = error instanceof IdentityError ? error : mapNetworkError(error);
  const numericCode = String(NUMERIC_ERROR_CODES[identityError.code] ?? DEFAULT_NUMERIC_CODE);
  return { code: identityError.code, numericCode, userMessage: translate(ERROR_KEYS[identityError.code]) };
}
