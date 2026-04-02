import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';
import type { SocialProfile } from './types';

interface GetSocialProfileDeps {
  userProfileDataSource: UserProfileDataSource;
}

export async function getSocialProfile(
  username: string,
  userIdOrMasterKey: string,
  deps: GetSocialProfileDeps,
): Promise<SocialProfile> {
  return deps.userProfileDataSource.getSocialProfile(userIdOrMasterKey, username);
}
