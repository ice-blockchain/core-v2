import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';
import type { UpdateSocialProfileInput, UpdateSocialProfileResult } from './types';

interface UpdateSocialProfileDeps {
  userProfileDataSource: UserProfileDataSource;
}

export async function updateSocialProfile(
  username: string,
  params: { userId: string; input: UpdateSocialProfileInput },
  deps: UpdateSocialProfileDeps,
): Promise<UpdateSocialProfileResult> {
  return deps.userProfileDataSource.updateSocialProfile(params.userId, username, params.input);
}
