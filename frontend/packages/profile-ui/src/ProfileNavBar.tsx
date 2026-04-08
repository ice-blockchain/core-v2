import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, useTheme } from "@ion/ui";

interface ProfileNavBarProps {
  showBackButton: boolean;
  onBackPress?: () => void;
  onMorePress?: () => void;
}

function useNavBarStyle() {
  const { scale, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingTop: insets.top,
      paddingHorizontal: scale.scaleSize(16),
      height: insets.top + scale.scaleSize(44),
      backgroundColor: colors.secondaryBackground,
    }),
    [insets.top, scale, colors],
  );
}

export function ProfileNavBar({ showBackButton, onBackPress, onMorePress }: ProfileNavBarProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useNavBarStyle();

  return (
    <View style={containerStyle}>
      {showBackButton ? (
        <Pressable onPress={onBackPress} hitSlop={8}>
          <Icon name="back-arrow" size={scale(24)} color={theme.colors.primaryText} />
        </Pressable>
      ) : (
        <View style={{ width: scale(24) }} />
      )}
      <View style={styles.spacer} />
      <Pressable onPress={onMorePress} hitSlop={8}>
        <Icon name="more-popup" size={scale(24)} color={theme.colors.quaternaryText} />
      </Pressable>
    </View>
  );
}

const styles = { spacer: { flex: 1 } };
