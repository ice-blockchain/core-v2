import { describe, it, expect, vi } from 'vitest';
import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';
import type { UpdateSocialProfileResult } from './types';
import { updateSocialProfile } from './update-social-profile';

const mockResult: UpdateSocialProfileResult = {
  username: 'alice',
  displayName: 'Alice Updated',
  referral: null,
  usernameProof: [],
  referralMasterKey: null,
};

function createMockDeps() {
  const userProfileDataSource: UserProfileDataSource = {
    getSocialProfile: vi.fn(),
    updateSocialProfile: vi.fn(() => Promise.resolve(mockResult)),
    verifyNickname: vi.fn(),
  };
  return { userProfileDataSource };
}

describe('updateSocialProfile', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    const input = { displayName: 'Alice Updated' };
    const result = await updateSocialProfile('alice', { userId: 'user-id-1', input }, deps);
    expect(result).toEqual(mockResult);
    expect(deps.userProfileDataSource.updateSocialProfile).toHaveBeenCalledWith('user-id-1', 'alice', input);
  });
});
