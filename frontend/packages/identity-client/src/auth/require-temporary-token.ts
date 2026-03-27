import { IdentityError, IdentityErrorCode } from '../errors';

export function requireTemporaryToken(token: string | null): string {
  if (!token || token.trim().length === 0) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Registration challenge missing temporary token');
  }
  return token;
}
