import { describe, it, expect, vi } from 'vitest';
import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';
import { verifyNickname } from './verify-nickname';

function createMockDeps() {
  const userProfileDataSource: UserProfileDataSource = {
    getSocialProfile: vi.fn(),
    updateSocialProfile: vi.fn(),
    verifyNickname: vi.fn(() => Promise.resolve()),
  };
  return { userProfileDataSource };
}

describe('verifyNickname', () => {
  it('delegates to data source with correct args', async () => {
    const deps = createMockDeps();
    await verifyNickname('alice', 'cool_nick', deps);
    expect(deps.userProfileDataSource.verifyNickname).toHaveBeenCalledWith('alice', 'cool_nick');
  });
});
