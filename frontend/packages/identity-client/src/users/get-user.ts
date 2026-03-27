import type { UserDataSource } from '../data-sources/user-data-source';
import type { TokenManager } from '../token/token-manager';
import type { User } from '../types';
import { IdentityError, IdentityErrorCode } from '../errors';

interface GetUserDeps {
  userDataSource: UserDataSource;
  tokenManager: TokenManager;
}

export async function getUser(
  username: string,
  userIdOrMasterKey: string,
  deps: GetUserDeps,
): Promise<User> {
  const tokens = await deps.tokenManager.getTokens(username);
  if (!tokens) {
    throw new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'No tokens found');
  }
  return deps.userDataSource.getUser(userIdOrMasterKey, tokens.token);
}
