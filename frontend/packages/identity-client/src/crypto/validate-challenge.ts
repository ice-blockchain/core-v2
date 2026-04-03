import { IdentityError, IdentityErrorCode } from '../errors';

const BASE64URL_CHARS = /^[A-Za-z0-9\-_+/=]+$/;

export function validateChallengeFormat(challenge: string): void {
  if (challenge.length < 16 || challenge.length > 16384) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid challenge format');
  }
  const parts = challenge.split('.');
  const isValid =
    (parts.length === 1 && BASE64URL_CHARS.test(challenge)) ||
    (parts.length === 3 && parts.every((p) => p.length > 0 && BASE64URL_CHARS.test(p)));
  if (!isValid) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid challenge format');
  }
}
