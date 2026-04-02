import type { ImageStyle, ViewStyle, TextStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildScreenStyle(backgroundColor: string): ViewStyle {
  return { flex: 1, backgroundColor };
}

export function buildHeaderStyle(scale: ScaleFn): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    height: scale(44),
  };
}

export function buildHeaderTitleStyle(): TextStyle {
  return { textAlign: "center" };
}

export function buildSearchContainerStyle(scale: ScaleFn): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
  };
}

export function buildEmptyStateStyle(scale: ScaleFn): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(9),
  };
}

export function buildEmptyStateInnerStyle(scale: ScaleFn): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
  };
}

export function buildEmptyStateImageStyle(scale: ScaleFn): ImageStyle {
  const size = scale(48);
  return { width: size, height: size };
}

export function buildCenteredTextStyle(): TextStyle {
  return { textAlign: "center" };
}
