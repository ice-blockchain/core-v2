import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Icon, SmallButton, Text, useTheme, colorPalette } from "@ion/ui";
import { translate } from "@ion/localization";
import type { ProfileData } from "./profile-types";
import { PROFILE_NAMESPACE } from "./translations";

const NS = PROFILE_NAMESPACE;

interface ProfileHeaderProps {
  profile: ProfileData;
  isCurrentUser: boolean;
  onEditProfile?: (() => void) | undefined;
}

export function ProfileHeader({ profile, isCurrentUser, onEditProfile }: ProfileHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const avatarSize = scale(65);

  const containerStyle = useMemo(
    () => ({
      alignItems: "center" as const,
      gap: scale(12),
    }),
    [scale],
  );

  const editIcon = useMemo(
    () => <Icon name="edit-link" size={scale(16)} color={theme.colors.onPrimaryAccent} />,
    [scale, theme.colors],
  );

  return (
    <View style={containerStyle}>
      <Avatar size={avatarSize} {...(profile.avatarUrl ? { imageUrl: profile.avatarUrl } : {})} borderRadius={scale(16)} />
      <NameSection displayName={profile.displayName} isVerified={profile.isVerified} />
      <Text variant="caption" color={theme.colors.quaternaryText}>@{profile.username}</Text>
      {isCurrentUser && (
        <SmallButton color="primary" icon={editIcon} label={translate(`${NS}:editProfile`)} {...(onEditProfile ? { onPress: onEditProfile } : {})} />
      )}
    </View>
  );
}

function NameSection({ displayName, isVerified }: { displayName: string; isVerified: boolean }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <View style={[styles.nameRow, { gap: scale(6) }]}>
      <Text variant="subtitle" style={styles.nameText} numberOfLines={1}>{displayName}</Text>
      {isVerified && <Icon name="badge-verify" size={scale(16)} color={colorPalette.lightBlue} />}
    </View>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, alignSelf: "stretch" as const, justifyContent: "center" },
  nameText: { textAlign: "center", flexShrink: 1 },
});
