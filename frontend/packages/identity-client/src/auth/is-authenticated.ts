import type { TokenManager } from '../token/token-manager';

interface IsAuthenticatedDeps {
  tokenManager: TokenManager;
}

export async function isAuthenticated(
  username: string,
  deps: IsAuthenticatedDeps,
): Promise<boolean> {
  const expired = await deps.tokenManager.isTokenExpired(username);
  return !expired;
}
