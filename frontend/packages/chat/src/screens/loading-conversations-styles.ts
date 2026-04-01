import type { ViewStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildSkeletonListStyle(scale: ScaleFn): ViewStyle {
  return {
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
  };
}

export function buildSearchSkeletonStyle(
  scale: ScaleFn,
  backgroundColor: string,
): ViewStyle {
  return {
    height: scale(36),
    borderRadius: scale(16),
    backgroundColor,
  };
}
