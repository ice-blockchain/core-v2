import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';

interface LogoutDeps {
  sessionDataSource: SessionDataSource;
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
}

export async function logout(
  username: string,
  deps: LogoutDeps,
): Promise<void> {
  try {
    await deps.sessionDataSource.logout(username);
  } finally {
    await deps.tokenManager.clearTokens(username);
    deps.authStore.removeUser(username);
  }
}
