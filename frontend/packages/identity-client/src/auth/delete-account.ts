import type { HttpClient } from '@ion/network';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { extractUserId } from '../token/extract-user-id';

interface DeleteAccountDeps {
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
  httpClient: HttpClient;
}

// The server expects `userAction` to be a base64-encoded Nostr Kind 5  (deletion) event,
// which must be created by the caller. The identity-client does not create this event.
export async function deleteAccount(
  username: string,
  userAction: string,
  deps: DeleteAccountDeps,
): Promise<void> {
  const userId = await extractUserId(username, deps.tokenManager);
  await deps.httpClient.delete(`/auth/users/${encodeURIComponent(userId)}`, {
    headers: {
      'X-Username': username,
      'X-Useraction': userAction,
    },
  });
  await deps.tokenManager.clearTokens(username);
  deps.authStore.removeUser(username);
}
