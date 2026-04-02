import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { IonConnectRelay } from './types';
import { getAvailableRelays } from './get-available-relays';

const mockRelays: IonConnectRelay[] = [{ url: 'wss://relay1.example.com', type: 'write' }];

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(() => Promise.resolve(mockRelays)),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(),
  };
  return { relayDataSource };
}

describe('getAvailableRelays', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    const result = await getAvailableRelays('alice', { userId: 'user-id-1', currentRelayUrl: 'wss://relay.ice.io' }, deps);
    expect(result).toEqual(mockRelays);
    expect(deps.relayDataSource.getAvailableRelays).toHaveBeenCalledWith('alice', 'user-id-1', 'wss://relay.ice.io');
  });
});
