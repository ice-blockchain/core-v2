import type { ViewStyle } from "react-native";

export function buildListContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: "100%",
    paddingHorizontal: scale(16),
    paddingTop: scale(34),
  };
}

// 104px = button (56) + gap (10) + max safe-area inset (34) + buffer (4)
export function buildListContentStyle(scale: (n: number) => number): ViewStyle {
  return {
    gap: scale(12),
    paddingBottom: scale(104),
  };
}
