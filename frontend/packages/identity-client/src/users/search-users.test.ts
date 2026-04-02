import { describe, it, expect, vi } from 'vitest';
import type { RelayDataSource } from '../data-sources/relay-data-source';
import type { SearchUsersParams } from './types';
import { searchUsers } from './search-users';

function createMockDeps() {
  const relayDataSource: RelayDataSource = {
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(() => Promise.resolve([])),
  };
  return { relayDataSource };
}

describe('searchUsers', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    const params: SearchUsersParams = { keyword: 'bob', limit: 10, offset: 0, type: 'startsWith' };
    const result = await searchUsers('alice', params, deps);
    expect(result).toEqual([]);
    expect(deps.relayDataSource.searchUsers).toHaveBeenCalledWith('alice', params);
  });
});
