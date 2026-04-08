import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { SharedValue, AnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, useTheme } from "@ion/ui";
import { CollapsedProfileHeader } from "./CollapsedProfileHeader";
import type { ProfileData } from "./profile-types";

interface ProfileNavBarProps {
  showBackButton: boolean;
  profile: ProfileData;
  collapsedHeaderOpacity: SharedValue<number>;
  navBarBgAnimatedStyle: AnimatedStyle;
  onBackPress?: () => void;
  onMorePress?: () => void;
}

function useNavBarLayout() {
  const { scale } = useTheme();
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      paddingTop: insets.top,
      paddingHorizontal: scale.scaleSize(16),
      height: insets.top + scale.scaleSize(44),
    }),
    [insets.top, scale],
  );
}

export function ProfileNavBar({ showBackButton, profile, collapsedHeaderOpacity, navBarBgAnimatedStyle, onBackPress, onMorePress }: ProfileNavBarProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const layout = useNavBarLayout();

  return (
    <Animated.View style={[styles.root, layout, navBarBgAnimatedStyle]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        {showBackButton ? (
          <Pressable onPress={onBackPress} hitSlop={8}>
            <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
          </Pressable>
        ) : (
          <View style={{ width: scale(24) }} />
        )}
        <CollapsedProfileHeader profile={profile} animatedOpacity={collapsedHeaderOpacity} />
        <Pressable onPress={onMorePress} hitSlop={8}>
          <Icon name="more-popup" size={scale(24)} color={theme.colors.quaternaryText} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
});
