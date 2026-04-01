import type { ViewStyle } from "react-native";

export function buildContentStyle(scale: (n: number) => number): ViewStyle {
  return { alignItems: "center", gap: scale(10), paddingTop: scale(16) };
}

export function buildTextGroupStyle(scale: (n: number) => number, bottomInset: number): ViewStyle {
  return { alignItems: "stretch", gap: scale(8), paddingHorizontal: scale(16), paddingBottom: scale(16) + bottomInset };
}
