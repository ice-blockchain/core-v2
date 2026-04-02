import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { GetContentCreatorsParams, UserRelayInfo } from './types';

interface GetContentCreatorsDeps {
  relayDataSource: RelayDataSource;
}

export async function getContentCreators(
  username: string,
  params: GetContentCreatorsParams,
  deps: GetContentCreatorsDeps,
): Promise<UserRelayInfo[]> {
  return deps.relayDataSource.getContentCreators(username, params.limit, params.excludeMasterPubKeys);
}
