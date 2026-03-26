import { IdentityError, IdentityErrorCode } from '../errors';

export function requireTemporaryToken(token: string | null): string {
  if (!token) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Registration challenge missing temporary token');
  }
  return token;
}
