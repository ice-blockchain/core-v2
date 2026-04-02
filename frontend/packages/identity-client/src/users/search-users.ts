import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { SearchUsersParams, UserRelayInfo } from './types';

interface SearchUsersDeps {
  relayDataSource: RelayDataSource;
}

export async function searchUsers(
  username: string,
  params: SearchUsersParams,
  deps: SearchUsersDeps,
): Promise<UserRelayInfo[]> {
  return deps.relayDataSource.searchUsers(username, params);
}
