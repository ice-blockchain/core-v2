import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { UserRelayInfo } from './types';
import { getContentCreators } from './get-content-creators';

const mockCreators: UserRelayInfo[] = [
  { masterPubKey: 'key1', ionConnectRelays: [], username: 'creator1', displayName: 'Creator', avatar: null },
];

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(() => Promise.resolve(mockCreators)),
    searchUsers: vi.fn(),
  };
  return { relayDataSource };
}

describe('getContentCreators', () => {
  it('unpacks params and delegates to data source', async () => {
    const deps = createMockDeps();
    const result = await getContentCreators('alice', { limit: 10, excludeMasterPubKeys: ['key2'] }, deps);
    expect(result).toEqual(mockCreators);
    expect(deps.relayDataSource.getContentCreators).toHaveBeenCalledWith('alice', 10, ['key2']);
  });
});
