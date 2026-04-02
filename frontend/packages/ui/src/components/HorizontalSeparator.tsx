import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";

export interface HorizontalSeparatorProps {
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const START = { x: 0, y: 0.5 };
const END = { x: 1, y: 0.5 };
const LOCATIONS = [0, 0.5, 1];

export function HorizontalSeparator({ height = 0.5, style }: HorizontalSeparatorProps) {
  const fillColor = useTheme().colors.onTertiaryFill;

  const gradientColors = useMemo(
    () => [`${fillColor}00`, fillColor, `${fillColor}00`],
    [fillColor],
  );

  const gradientStyle = useMemo(
    () => ({ height, alignSelf: "stretch" as const }),
    [height],
  );

  return (
    <LinearGradient colors={gradientColors} start={START} end={END} locations={LOCATIONS} style={[gradientStyle, style]} />
  );
}
