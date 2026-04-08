import { useCallback, useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Text, useTheme, colorPalette } from "@ion/ui";
import type { ProfileData } from "./profile-types";
import { ProfileInfoTile } from "./ProfileInfoTile";

interface ProfileBioProps {
  profile: ProfileData;
}

function InfoTiles({ profile }: ProfileBioProps) {
  const scale = useTheme().scale.scaleSize;

  const tilesStyle = useMemo(
    () => ({ flexDirection: "row" as const, flexWrap: "wrap" as const, gap: scale(8), rowGap: scale(4) }),
    [scale],
  );

  const handleWebsitePress = useCallback(() => {
    if (profile.website) Linking.openURL(`https://${profile.website}`);
  }, [profile.website]);

  return (
    <View style={tilesStyle}>
      {profile.category && <ProfileInfoTile iconName="blockchain" text={profile.category} />}
      {profile.website && <ProfileInfoTile iconName="article-link" text={profile.website} textColor={colorPalette.darkBlue} onPress={handleWebsitePress} />}
      {profile.joinDate && <ProfileInfoTile iconName="field-calendar" text={profile.joinDate} />}
      {profile.location && <ProfileInfoTile iconName="profile-location" text={profile.location} />}
    </View>
  );
}

export function ProfileBio({ profile }: ProfileBioProps) {
  const scale = useTheme().scale.scaleSize;
  const hasBio = Boolean(profile.bio);
  const hasTiles = Boolean(profile.category || profile.website || profile.joinDate || profile.location);

  const containerStyle = useMemo(
    () => ({ paddingHorizontal: scale(16), gap: scale(12) }),
    [scale],
  );

  if (!hasBio && !hasTiles) return null;

  return (
    <View style={containerStyle}>
      {hasBio && <Text variant="body2" style={styles.bioText}>{profile.bio}</Text>}
      {hasTiles && <InfoTiles profile={profile} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bioText: { lineHeight: 21 },
});
