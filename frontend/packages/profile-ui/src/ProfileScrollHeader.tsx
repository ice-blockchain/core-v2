import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { HorizontalSeparator } from "@ion/ui";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import type { ProfileData } from "./profile-types";

interface ProfileScrollHeaderProps {
  spacerHeight: number;
  sectionStyle: ViewStyle;
  profile: ProfileData;
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
