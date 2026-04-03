import type { ViewStyle, TextStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildSheetHeaderStyle(scale: ScaleFn): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: scale(21.5),
    paddingBottom: scale(16),
  };
}

export function buildSearchContainerStyle(scale: ScaleFn): ViewStyle {
  return {
    paddingHorizontal: scale(16),
  };
}

export function buildEmptyStateStyle(): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  };
}

export function buildEmptyStateInnerStyle(scale: ScaleFn): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
    width: scale(186),
  };
}

export function buildEmptyStateImageStyle(scale: ScaleFn): { width: number; height: number } {
  const size = scale(48);
  return { width: size, height: size };
}

export function buildCenteredTextStyle(): TextStyle {
  return { textAlign: "center" };
}

export function buildContentStyle(): ViewStyle {
  return { flex: 1 };
}
