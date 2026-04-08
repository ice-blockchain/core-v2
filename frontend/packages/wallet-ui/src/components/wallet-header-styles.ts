import type { ViewStyle } from "react-native";

interface ThemeColors {
  onTertiaryFill: string;
  tertiaryBackground: string;
}

export function buildPillStyle(
  scale: (n: number) => number,
  scaleRadius: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    height: scale(40),
    paddingLeft: scale(6),
    paddingRight: scale(12),
    borderRadius: scaleRadius(12),
    borderWidth: 1,
    borderColor: colors.onTertiaryFill,
    backgroundColor: colors.tertiaryBackground,
    gap: scale(3),
  };
}

export function buildScanButtonStyle(
  scale: (n: number) => number,
  scaleRadius: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    width: scale(40),
    height: scale(40),
    borderRadius: scaleRadius(16),
    borderWidth: 1,
    borderColor: colors.onTertiaryFill,
    backgroundColor: colors.tertiaryBackground,
  };
}
