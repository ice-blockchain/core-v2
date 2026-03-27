import { NetworkError } from '@ion/network';
import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import { IdentityError, IdentityErrorCode } from '../errors';

interface RefreshTokenDeps {
  sessionDataSource: SessionDataSource;
  tokenManager: TokenManager;
  refreshLocks: Map<string, Promise<void>>;
}

function isPermanentAuthFailure(error: unknown): boolean {
  return error instanceof NetworkError &&
    error.status !== undefined &&
    (error.status === 401 || error.status === 403);
}

// Deduplicates concurrent refresh calls per username. Relies on JS single-threaded
// execution: the synchronous check-then-set (lines below) cannot be interleaved.
// If the first refresh fails, waiting callers receive the same rejection and tokens
// are cleared — this is intentional fail-fast behavior.
export async function refreshToken(
  username: string,
  deps: RefreshTokenDeps,
): Promise<void> {
  const existing = deps.refreshLocks.get(username);
  if (existing) { await existing; return; }
  const promise = executeRefresh(username, deps);
  deps.refreshLocks.set(username, promise);
  try { await promise; } finally { deps.refreshLocks.delete(username); }
}

async function executeRefresh(
  username: string,
  deps: RefreshTokenDeps,
): Promise<void> {
  const tokens = await deps.tokenManager.getTokens(username);
  if (!tokens) {
    throw new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'No tokens found');
  }
  try {
    const result = await deps.sessionDataSource.refreshToken({
      username,
      currentToken: tokens.token,
      refreshToken: tokens.refreshToken,
    });
    await deps.tokenManager.setTokens(username, {
      token: result.token,
      refreshToken: result.refreshToken ?? tokens.refreshToken,
    });
  } catch (error) {
    if (isPermanentAuthFailure(error)) {
      await deps.tokenManager.clearTokens(username);
    }
    throw error;
  }
}
