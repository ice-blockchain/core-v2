import type { ImageStyle, ViewStyle } from "react-native";

interface ThemeColors {
  secondaryBackground: string;
}

export function buildContainerStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(16),
    gap: scale(16),
  };
}

export function buildEmptyImageStyle(
  scale: (n: number) => number,
): ImageStyle {
  return { width: scale(48), height: scale(48) };
}

export function buildEmptyStateStyle(
  scale: (n: number) => number,
): ViewStyle {
  return {
    gap: scale(8),
    paddingVertical: scale(65),
  };
}