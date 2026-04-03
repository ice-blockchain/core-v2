import { describe, it, expect, vi } from 'vitest';
import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';
import type { SocialProfile } from './types';
import { getSocialProfile } from './get-social-profile';

const mockProfile: SocialProfile = {
  username: 'alice',
  displayName: 'Alice',
  avatar: null,
  bio: 'Hello',
  referral: null,
  referralMasterKey: null,
  referralCount: 0,
};

function createMockDeps() {
  const userProfileDataSource: UserProfileDataSource = {
    getSocialProfile: vi.fn(() => Promise.resolve(mockProfile)),
    updateSocialProfile: vi.fn(),
    verifyNickname: vi.fn(),
  };
  return { userProfileDataSource };
}

describe('getSocialProfile', () => {
  it('delegates to data source with swapped arg order', async () => {
    const deps = createMockDeps();
    const result = await getSocialProfile('alice', 'user-id-1', deps);
    expect(result).toEqual(mockProfile);
    expect(deps.userProfileDataSource.getSocialProfile).toHaveBeenCalledWith('user-id-1', 'alice');
  });
});
