import { IdentityError, IdentityErrorCode } from '../errors';

const CHALLENGE_PATTERN = /^[A-Za-z0-9\-_+/=.]{16,16384}$/;

export function validateChallengeFormat(challenge: string): void {
  if (!CHALLENGE_PATTERN.test(challenge)) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Invalid challenge format');
  }
}
