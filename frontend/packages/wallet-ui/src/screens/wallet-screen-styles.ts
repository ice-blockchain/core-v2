import type { ViewStyle } from "react-native";

interface ThemeColors {
  secondaryBackground: string;
  primaryBackground: string;
  shadow: string;
}

export function buildScreenContainerStyle(
  colors: ThemeColors,
): ViewStyle {
  return { flex: 1, backgroundColor: colors.secondaryBackground };
}

export function buildHeaderSectionStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    backgroundColor: colors.secondaryBackground,
    paddingTop: scale(8),
    paddingBottom: scale(18),
    gap: scale(14),
  };
}

export function buildBannerWrapperStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    backgroundColor: colors.secondaryBackground,
    paddingVertical: scale(16),
  };
}

export function buildScrollContentStyle(): ViewStyle {
  return { paddingBottom: 0 };
}

export function buildHeaderWrapperStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    backgroundColor: colors.secondaryBackground,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  };
}

export function buildHeaderShadowStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 1,
    shadowRadius: scale(10),
    elevation: 3,
  };
}

export function buildGapStyle(
  scale: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return { gap: scale(4), backgroundColor: colors.primaryBackground };
}
