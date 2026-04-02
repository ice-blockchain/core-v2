import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { IonConnectRelay } from './types';
import { setIonConnectRelays } from './set-ion-connect-relays';

const mockRelays: IonConnectRelay[] = [{ url: 'wss://relay1.example.com', type: 'read' }];

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(() => Promise.resolve(mockRelays)),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(),
  };
  return { relayDataSource };
}

describe('setIonConnectRelays', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    const result = await setIonConnectRelays('alice', { userId: 'user-id-1', followeeList: ['wss://r1'] }, deps);
    expect(result).toEqual(mockRelays);
    expect(deps.relayDataSource.setIonConnectRelays).toHaveBeenCalledWith('user-id-1', 'alice', ['wss://r1']);
  });
});
