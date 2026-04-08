import type { ViewStyle } from "react-native";

export function buildSectionStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(12),
  };
}

export function buildStoryItemStyle(): ViewStyle {
  return {
    alignItems: "center",
    width: 65,
    gap: 8,
  };
}
