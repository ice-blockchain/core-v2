import type { TokenManager } from './token-manager';
import { IdentityError, IdentityErrorCode } from '../errors';
import { parseUserIdFromToken } from './parse-user-id-from-token';

export async function extractUserId(username: string, tokenManager: TokenManager): Promise<string> {
  const tokens = await tokenManager.getTokens(username);
  if (!tokens) throw new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'No tokens found');
  const userId = parseUserIdFromToken(tokens.token);
  if (!userId) throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Missing userId in JWT');
  return userId;
}
