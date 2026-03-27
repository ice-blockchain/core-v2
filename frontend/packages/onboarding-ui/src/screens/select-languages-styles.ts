import type { ViewStyle } from "react-native";

export function buildTitleContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
    paddingTop: scale(16),
  };
}

export function buildListSectionStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: "100%",
    paddingHorizontal: scale(16),
    paddingTop: scale(34),
    gap: scale(12),
  };
}

// 104px = button (56) + gap (10) + max safe-area inset (34) + buffer (4)
export function buildScrollContentStyle(scale: (n: number) => number): ViewStyle {
  return {
    gap: scale(12),
    paddingBottom: scale(104),
  };
}
