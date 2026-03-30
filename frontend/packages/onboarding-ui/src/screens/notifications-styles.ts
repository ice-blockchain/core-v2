import type { ViewStyle } from "react-native";

export function buildScreenContentStyle(scale: (n: number) => number): ViewStyle {
  return {
    paddingHorizontal: scale(16),
  };
}

export function buildCardsContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    alignItems: "center",
    width: "100%",
    paddingTop: scale(34),
  };
}

export function buildCardsInnerStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: scale(290),
    gap: scale(8),
  };
}

export function buildDescriptionsContainerStyle(scale: (n: number) => number): ViewStyle {
  return {
    width: scale(290),
    alignSelf: "center",
    gap: scale(20),
    paddingTop: scale(69),
  };
}

