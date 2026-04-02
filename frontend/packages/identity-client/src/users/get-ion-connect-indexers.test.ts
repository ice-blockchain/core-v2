import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import { getIonConnectIndexers } from './get-ion-connect-indexers';

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(() => Promise.resolve(['wss://idx1.example.com'])),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(),
  };
  return { relayDataSource };
}

describe('getIonConnectIndexers', () => {
  it('delegates to data source with swapped arg order', async () => {
    const deps = createMockDeps();
    const result = await getIonConnectIndexers('alice', 'user-id-1', deps);
    expect(result).toEqual(['wss://idx1.example.com']);
    expect(deps.relayDataSource.getIonConnectIndexers).toHaveBeenCalledWith('user-id-1', 'alice');
  });
});
