import { IdentityError, IdentityErrorCode } from '../errors';

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(obj: Record<string, unknown>, field: string): void {
  if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, `Invalid response: missing or empty ${field}`);
  }
}

function assertRelyingParty(rp: unknown): void {
  if (!isNonNullObject(rp)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid response: missing rp');
  }
  assertString(rp, 'id');
  assertString(rp, 'name');
}

export function validateActionChallengeResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid login challenge response');
  }
  assertString(value, 'challenge');
  assertString(value, 'challengeIdentifier');
  assertRelyingParty(value.rp);
  if (!isNonNullObject(value.allowCredentials)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid response: missing allowCredentials');
  }
}

export function validateRegistrationChallengeResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid registration challenge response');
  }
  assertString(value, 'challenge');
  assertRelyingParty(value.rp);
  if (!isNonNullObject(value.user)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid response: missing user');
  }
  assertString(value.user as Record<string, unknown>, 'id');
  assertString(value.user as Record<string, unknown>, 'name');
}

export function validateAuthTokensResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid auth tokens response');
  }
  assertString(value, 'token');
  assertString(value, 'refreshToken');
}

export function validateRegistrationResultResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid registration result response');
  }
  if (!isNonNullObject(value.authentication)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid response: missing authentication');
  }
  validateAuthTokensResponse(value.authentication);
  if (!isNonNullObject(value.user)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid response: missing user');
  }
  assertString(value.user as Record<string, unknown>, 'id');
}

export function validateRefreshTokenResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid refresh token response');
  }
  assertString(value, 'token');
}

export function validateUserActionResponse(value: unknown): void {
  if (!isNonNullObject(value)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid user action response');
  }
  assertString(value, 'userAction');
}
