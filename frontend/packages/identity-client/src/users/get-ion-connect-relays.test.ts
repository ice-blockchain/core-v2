import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { UserRelayInfo } from './types';
import { getIonConnectRelays } from './get-ion-connect-relays';

const mockRelayInfos: UserRelayInfo[] = [
  { masterPubKey: 'key1', ionConnectRelays: [], username: 'alice', displayName: 'Alice', avatar: null },
];

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(() => Promise.resolve(mockRelayInfos)),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(),
  };
  return { relayDataSource };
}

describe('getIonConnectRelays', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    const result = await getIonConnectRelays('alice', ['key1', 'key2'], deps);
    expect(result).toEqual(mockRelayInfos);
    expect(deps.relayDataSource.getIonConnectRelays).toHaveBeenCalledWith('alice', ['key1', 'key2']);
  });
});
