import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';

interface RestoreAuthDeps {
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
}

async function hasValidTokens(username: string, tokenManager: TokenManager): Promise<boolean> {
  const tokens = await tokenManager.getTokens(username);
  return tokens !== null;
}

export async function restoreAuth(deps: RestoreAuthDeps): Promise<void> {
  const trackedUsers = await deps.tokenManager.getTrackedUsers();
  if (trackedUsers.length === 0) return;

  for (const username of trackedUsers) {
    const isValid = await hasValidTokens(username, deps.tokenManager);
    if (isValid) {
      deps.authStore.addUser(username);
    } else {
      await deps.tokenManager.clearTokens(username);
    }
  }
}
