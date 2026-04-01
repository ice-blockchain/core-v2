import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";

export interface ListItemSkeletonProps {
  readonly nameWidth: number;
  readonly messageWidth: number;
}

function buildRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  };
}

function buildAvatarStyle(
  scale: (n: number) => number,
  backgroundColor: string,
): ViewStyle {
  const size = scale(48);
  return {
    width: size,
    height: size,
    borderRadius: scale(14.4),
    backgroundColor,
  };
}

function buildTextGroupStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: scale(8),
  };
}

interface LineStyleOptions {
  readonly scale: (n: number) => number;
  readonly backgroundColor: string;
  readonly width: number;
  readonly height: number;
}

function buildLineStyle(options: LineStyleOptions): ViewStyle {
  return {
    width: options.scale(options.width),
    height: options.scale(options.height),
    borderRadius: options.scale(16),
    backgroundColor: options.backgroundColor,
  };
}

export function ListItemSkeleton({ nameWidth, messageWidth }: ListItemSkeletonProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const bgColor = theme.colors.tertiaryBackground;

  const row = useMemo(() => buildRowStyle(scale), [scale]);
  const avatar = useMemo(() => buildAvatarStyle(scale, bgColor), [scale, bgColor]);
  const textGroup = useMemo(() => buildTextGroupStyle(scale), [scale]);
  const nameLine = useMemo(() => buildLineStyle({ scale, backgroundColor: bgColor, width: nameWidth, height: 19 }), [scale, bgColor, nameWidth]);
  const messageLine = useMemo(() => buildLineStyle({ scale, backgroundColor: bgColor, width: messageWidth, height: 16 }), [scale, bgColor, messageWidth]);

  return (
    <View style={row}>
      <View style={avatar} />
      <View style={textGroup}>
        <View style={nameLine} />
        <View style={messageLine} />
      </View>
    </View>
  );
}
