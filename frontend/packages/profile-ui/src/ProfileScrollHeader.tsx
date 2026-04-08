import { View } from "react-native";
import { HorizontalSeparator } from "@ion/ui";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import type { MOCK_PROFILE } from "./profile-mock-data";

interface ProfileScrollHeaderProps {
  spacerHeight: number;
  sectionStyle: object;
  profile: typeof MOCK_PROFILE;
  isCurrentUser: boolean;
}

export function ProfileScrollHeader({ spacerHeight, sectionStyle, profile, isCurrentUser }: ProfileScrollHeaderProps) {
  return (
    <>
      <View style={{ height: spacerHeight }} />
      <ProfileHeader profile={profile} isCurrentUser={isCurrentUser} />
      <View style={sectionStyle}>
        <ProfileStats followingCount={profile.followingCount} followersCount={profile.followersCount} />
      </View>
      <ProfileBio profile={profile} />
      <View style={styles.separatorWrap}><HorizontalSeparator /></View>
    </>
  );
}

const styles = { separatorWrap: { paddingTop: 12 } };
