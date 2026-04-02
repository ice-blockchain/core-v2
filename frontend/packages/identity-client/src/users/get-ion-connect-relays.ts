import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { UserRelayInfo } from './types';

interface GetIonConnectRelaysDeps {
  relayDataSource: RelayDataSource;
}

export async function getIonConnectRelays(
  username: string,
  masterPubkeys: string[],
  deps: GetIonConnectRelaysDeps,
): Promise<UserRelayInfo[]> {
  return deps.relayDataSource.getIonConnectRelays(username, masterPubkeys);
}
