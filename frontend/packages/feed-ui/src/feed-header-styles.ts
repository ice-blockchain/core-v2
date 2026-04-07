import type { ViewStyle } from "react-native";

export function buildHeaderStyle(scale: (n: number) => number, topInset: number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: topInset + scale(8),
    paddingHorizontal: scale(16),
    paddingBottom: scale(8),
    gap: scale(12),
  };
}
