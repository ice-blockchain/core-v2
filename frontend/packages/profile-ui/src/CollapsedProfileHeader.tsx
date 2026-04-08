import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Avatar, Icon, Text, useTheme, colorPalette } from "@ion/ui";
import type { ProfileData } from "./profile-types";

interface CollapsedProfileHeaderProps {
  profile: ProfileData;
  animatedOpacity: SharedValue<number>;
}

export function CollapsedProfileHeader({ profile, animatedOpacity }: CollapsedProfileHeaderProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
    pointerEvents: animatedOpacity.value >= 0.5 ? ("auto" as const) : ("none" as const),
  }), [animatedOpacity]);

  const rowStyle = useMemo(() => ({ gap: scale(10) }), [scale]);
  const textColumnStyle = useMemo(() => ({ gap: scale(1) }), [scale]);

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle, rowStyle]}>
      <Avatar
        size={scale(36)}
        borderRadius={scale(10)}
        {...(profile.avatarUrl ? { imageUrl: profile.avatarUrl } : {})}
      />
      <View style={[styles.textColumn, textColumnStyle]}>
        <NameRow displayName={profile.displayName} isVerified={profile.isVerified} />
        <Text variant="caption" color={theme.colors.quaternaryText} numberOfLines={1}>@{profile.username}</Text>
      </View>
    </Animated.View>
  );
}

function NameRow({ displayName, isVerified }: { displayName: string; isVerified: boolean }) {
  const scale = useTheme().scale.scaleSize;
  return (
    <View style={[styles.nameRow, { gap: scale(3) }]}>
      <Text variant="subtitle3" numberOfLines={1} style={styles.nameText}>{displayName}</Text>
      {isVerified && <Icon name="badge-verify" size={scale(16)} color={colorPalette.lightBlue} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", alignItems: "center" },
  textColumn: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  nameText: { flexShrink: 1, maxWidth: "70%" },
});
