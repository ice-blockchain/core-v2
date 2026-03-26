import { describe, it, expect, vi } from 'vitest';
import type { UserDataSource } from '../data-sources/user-data-source';
import type { TokenManager } from '../token/token-manager';
import type { User } from '../types';
import { getUser } from './get-user';
import { IdentityErrorCode } from '../errors';

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
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve({ token: 'tok-123', refreshToken: 'ref-456' })),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
  };
  return { userDataSource, tokenManager };
}

describe('getUser', () => {
  it('fetches user with stored token', async () => {
    const deps = createMockDeps();
    const user = await getUser('alice', 'user-id-1', deps);
    expect(user).toEqual(mockUser);
    expect(deps.userDataSource.getUser).toHaveBeenCalledWith('user-id-1', 'tok-123');
  });

  it('throws UNAUTHENTICATED when no tokens stored', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.tokenManager.getTokens).mockResolvedValueOnce(null);
    await expect(getUser('alice', 'user-id-1', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.UNAUTHENTICATED,
    });
  });
});
