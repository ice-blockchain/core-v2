export interface SocialProfile {
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  referral: string | null;
  referralMasterKey: string | null;
  referralCount: number;
}

export interface UpdateSocialProfileInput {
  username?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  referral?: string;
  referralMasterKey?: string;
  referralCount?: number;
}

export interface UpdateSocialProfileResult {
  username: string;
  displayName: string | null;
  referral: string | null;
  usernameProof: unknown[];
  referralMasterKey: string | null;
}

