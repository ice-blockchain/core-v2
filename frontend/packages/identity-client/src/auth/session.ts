import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import { IdentityError, IdentityErrorCode } from '../errors';

interface SessionDeps {
  sessionDataSource: SessionDataSource;
  tokenManager: TokenManager;
}

export async function logout(
  username: string,
  deps: SessionDeps,
): Promise<void> {
  const tokens = await deps.tokenManager.getTokens(username);
  if (tokens) {
    await deps.sessionDataSource.logout(tokens.token, username);
  }
  await deps.tokenManager.clearTokens(username);
}

export async function refreshToken(
  username: string,
  deps: SessionDeps,
): Promise<void> {
  const tokens = await deps.tokenManager.getTokens(username);
  if (!tokens) {
    throw new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'No tokens found');
  }
  try {
    const result = await deps.sessionDataSource.refreshToken(username, tokens.token, tokens.refreshToken);
    await deps.tokenManager.setTokens(username, {
      token: result.token,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    await deps.tokenManager.clearTokens(username);
    throw error;
  }
}

export async function isAuthenticated(
  username: string,
  deps: Pick<SessionDeps, 'tokenManager'>,
): Promise<boolean> {
  const expired = await deps.tokenManager.isTokenExpired(username);
  return !expired;
}
