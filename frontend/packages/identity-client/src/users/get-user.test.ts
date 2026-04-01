import { describe, it, expect, vi } from 'vitest';
import type { UserDataSource } from '../data-sources/user-data-source';
import type { User } from '../types';
import { getUser } from './get-user';

const mockUser: User = {
  '2faOptions': null,
  duplicateOf: null,
  email: ['alice@example.com'],
  ionConnectIndexerRelays: null,
  ionConnectRelays: null,
  masterPubKey: 'abcdef0123456789',
  phoneNumber: null,
};

function createMockDeps() {
  const userDataSource: UserDataSource = {
    getUser: vi.fn(() => Promise.resolve(mockUser)),
  };
  return { userDataSource };
}

describe('getUser', () => {
  it('fetches user with username header', async () => {
    const deps = createMockDeps();
    const user = await getUser('alice', 'user-id-1', deps);
    expect(user).toEqual(mockUser);
    expect(deps.userDataSource.getUser).toHaveBeenCalledWith('user-id-1', 'alice');
  });
});
