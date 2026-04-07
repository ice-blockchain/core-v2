import { Logger } from '@ion/diagnostics';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';

interface RestoreAuthDeps {
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
}

export async function restoreAuth(deps: RestoreAuthDeps): Promise<void> {
  const trackedUsers = await deps.tokenManager.getTrackedUsers();
  if (trackedUsers.length === 0) return;

  for (const username of trackedUsers) {
    const tokens = await deps.tokenManager.getTokens(username);
    if (!tokens) {
      Logger.info('Clearing tracked user with missing tokens', { tag: 'auth', data: { username } });
      await deps.tokenManager.clearTokens(username);
      continue;
    }
    const isExpired = await deps.tokenManager.isTokenExpired(username);
    if (isExpired) {
      Logger.info('Clearing tracked user with expired tokens', { tag: 'auth', data: { username } });
      await deps.tokenManager.clearTokens(username);
      continue;
    }
    deps.authStore.addUser(username);
  }
}
