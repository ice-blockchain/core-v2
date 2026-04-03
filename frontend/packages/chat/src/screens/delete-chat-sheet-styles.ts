import type { ViewStyle, TextStyle } from "react-native";

type ScaleFn = (n: number) => number;

export function buildContentStyle(scale: ScaleFn): ViewStyle {
  return {
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingTop: scale(24),
    paddingBottom: scale(20),
  };
}

export function buildIllustrationStyle(scale: ScaleFn): { width: number; height: number } {
  const size = scale(80);
  return { width: size, height: size };
}

export function buildTextGroupStyle(scale: ScaleFn): ViewStyle {
  return {
    alignItems: "center",
    gap: scale(8),
  };
}

export function buildDescriptionStyle(scale: ScaleFn): TextStyle {
  return { textAlign: "center", width: scale(271) };
}

export function buildButtonRowStyle(scale: ScaleFn): ViewStyle {
  return {
    flexDirection: "row",
    gap: scale(15),
    marginTop: scale(10),
    width: scale(343),
  };
}

export function buildButtonStyle(): ViewStyle {
  return { flex: 1 };
}
