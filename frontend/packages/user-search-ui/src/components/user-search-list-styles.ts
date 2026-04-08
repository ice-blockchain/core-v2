import type { ViewStyle } from "react-native";

export function buildContainerStyle(backgroundColor: string): ViewStyle {
  return { flex: 1, backgroundColor };
}

export function buildContentStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    gap: scale(14),
  };
}

export function buildSearchBarContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  };
}

export function buildEmptyStateStyle(scale: (n: number) => number): ViewStyle {
  return {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  };
}
