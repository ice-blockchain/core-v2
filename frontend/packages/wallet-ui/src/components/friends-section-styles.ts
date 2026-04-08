import type { ViewStyle } from "react-native";

interface ThemeColors {
  secondaryBackground: string;
}

export function buildContainerStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    height: scale(140),
    backgroundColor: colors.secondaryBackground,
  };
}

export function buildHeaderStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
  };
}

export function buildListContentStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    marginTop: scale(12),
  };
}
