import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';

interface LogoutDeps {
  sessionDataSource: SessionDataSource;
  tokenManager: TokenManager;
}

export async function logout(
  username: string,
  deps: LogoutDeps,
): Promise<void> {
  const tokens = await deps.tokenManager.getTokens(username);
  try {
    if (tokens) {
      await deps.sessionDataSource.logout(tokens.token, username);
    }
  } finally {
    await deps.tokenManager.clearTokens(username);
  }
}
