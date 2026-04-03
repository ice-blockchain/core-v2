import type { UserDataSource } from '../data-sources/user-data-source';
import type { User } from '../types';

interface GetUserDeps {
  userDataSource: UserDataSource;
}

export async function getUser(
  username: string,
  userIdOrMasterKey: string,
  deps: GetUserDeps,
): Promise<User> {
  return deps.userDataSource.getUser(userIdOrMasterKey, username);
}
