import { useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme } from "@ion/ui";

const SKELETON_COUNT = 8;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

function buildRowStyle(scale: (n: number) => number, backgroundColor: string): ViewStyle {
  return {
    height: scale(35),
    borderRadius: scale(16),
    backgroundColor,
  };
}

function buildContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    gap: scale(16),
  };
}

export function UserSearchSkeleton() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const containerStyle = useMemo(() => buildContainerStyle(scale), [scale]);
  const rowStyle = useMemo(() => buildRowStyle(scale, theme.colors.tertiaryBackground), [scale, theme.colors.tertiaryBackground]);

  return (
    <View style={containerStyle}>
      {SKELETON_IDS.map((id) => (
        <View key={id} style={rowStyle} />
      ))}
    </View>
  );
}
