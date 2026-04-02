import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { IonConnectRelay } from './types';

interface GetAvailableRelaysDeps {
  relayDataSource: RelayDataSource;
}

export async function getAvailableRelays(
  username: string,
  params: { userId: string; currentRelayUrl: string },
  deps: GetAvailableRelaysDeps,
): Promise<IonConnectRelay[]> {
  return deps.relayDataSource.getAvailableRelays(username, params.userId, params.currentRelayUrl);
}
