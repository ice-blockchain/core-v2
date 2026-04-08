export interface ProfileData {
  displayName: string;
  username: string;
  isVerified: boolean;
  avatarUrl: string | undefined;
  followersCount: number;
  followingCount: number;
  bio: string | undefined;
  category: string | undefined;
  website: string | undefined;
  joinDate: string | undefined;
  location: string | undefined;
}
