import type { ViewStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildSearchContainerStyle(scale: ScaleFn): ViewStyle {
  return {
    paddingHorizontal: scale(16),
  };
}
