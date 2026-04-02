import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { IonConnectRelay } from './types';

interface SetIonConnectRelaysDeps {
  relayDataSource: RelayDataSource;
}

export async function setIonConnectRelays(
  username: string,
  params: { userId: string; followeeList: string[] },
  deps: SetIonConnectRelaysDeps,
): Promise<IonConnectRelay[]> {
  return deps.relayDataSource.setIonConnectRelays(params.userId, username, params.followeeList);
}
