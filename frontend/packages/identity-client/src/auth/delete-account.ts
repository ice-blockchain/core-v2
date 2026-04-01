import type { HttpClient } from '@ion/network';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { executeSignedRequest } from './execute-signed-request';
import { IdentityError, IdentityErrorCode } from '../errors';
import { parseUserIdFromToken } from '../token/parse-user-id-from-token';

interface DeleteAccountDeps {
  userActionDataSource: UserActionDataSource;
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
  httpClient: HttpClient;
  origin: string;
}

export async function deleteAccount(
  username: string,
  signingContext: { kind: 'password'; password: string } | { kind: 'passkey' },
  deps: DeleteAccountDeps,
): Promise<void> {
  const userId = await extractUserId(username, deps.tokenManager);
  await executeSignedRequest<void>({
    username,
    httpMethod: 'DELETE',
    httpPath: `/auth/users/${userId}`,
    signingContext,
  }, { userActionDataSource: deps.userActionDataSource, httpClient: deps.httpClient, origin: deps.origin });
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
