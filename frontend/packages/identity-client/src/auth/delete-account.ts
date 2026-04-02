import type { HttpClient } from '@ion/network';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { IdentityError, IdentityErrorCode } from '../errors';
import { parseUserIdFromToken } from '../token/parse-user-id-from-token';

interface DeleteAccountDeps {
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
  httpClient: HttpClient;
}

// NOT YET FUNCTIONAL: The server expects `userAction` to be a base64-encoded Nostr Kind 5
// (deletion) event, which must be created by the caller (app/actions layer). The identity-client
// does not create this event.
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

async function extractUserId(username: string, tokenManager: TokenManager): Promise<string> {
  const tokens = await tokenManager.getTokens(username);
  if (!tokens) throw new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'No tokens found');
  const userId = parseUserIdFromToken(tokens.token);
  if (!userId) throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Missing userId in JWT');
  return userId;
}
