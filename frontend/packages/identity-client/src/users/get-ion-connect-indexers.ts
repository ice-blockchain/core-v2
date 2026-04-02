import type { RelayDataSource } from '../data-sources/relay-data-source';

interface GetIonConnectIndexersDeps {
  relayDataSource: RelayDataSource;
}

export async function getIonConnectIndexers(
  username: string,
  userId: string,
  deps: GetIonConnectIndexersDeps,
): Promise<string[]> {
  return deps.relayDataSource.getIonConnectIndexers(userId, username);
}
