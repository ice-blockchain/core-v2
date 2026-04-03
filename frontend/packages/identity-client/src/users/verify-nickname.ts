import type { UserProfileDataSource } from '../data-sources/user-profile-data-source';

interface VerifyNicknameDeps {
  userProfileDataSource: UserProfileDataSource;
}

export async function verifyNickname(
  username: string,
  nickname: string,
  deps: VerifyNicknameDeps,
): Promise<void> {
  return deps.userProfileDataSource.verifyNickname(username, nickname);
}
