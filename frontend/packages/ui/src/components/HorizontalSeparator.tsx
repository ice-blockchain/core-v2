import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";

export interface HorizontalSeparatorProps {
  style?: StyleProp<ViewStyle>;
}

const CONTAINER_STYLE: ViewStyle = {
  height: 0.5,
  flexDirection: "row",
  alignSelf: "stretch",
};

function buildSegmentStyle(color: string, flex: number): ViewStyle {
  return { flex, backgroundColor: color };
}

export function HorizontalSeparator({ style }: HorizontalSeparatorProps) {
  const theme = useTheme();
  const { colors } = theme;

  const leftStyle = useMemo(
    () => buildSegmentStyle(colors.secondaryBackground, 1),
    [colors.secondaryBackground],
  );

  const centerStyle = useMemo(
    () => buildSegmentStyle(colors.onTertiaryFill, 2),
    [colors.onTertiaryFill],
  );

  const rightStyle = useMemo(
    () => buildSegmentStyle(colors.secondaryBackground, 1),
    [colors.secondaryBackground],
  );

  return (
    <View style={[CONTAINER_STYLE, style]}>
      <View style={leftStyle} />
      <View style={centerStyle} />
      <View style={rightStyle} />
    </View>
  );
}
