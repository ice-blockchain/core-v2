import type { ViewStyle } from "react-native";
import type { SemanticColors } from "@ion/ui";

export function buildContainerStyle(colors: SemanticColors): ViewStyle {
  return { flex: 1, backgroundColor: colors.secondaryBackground };
}

export function buildBackButtonStyle(scale: (n: number) => number, topInset: number): ViewStyle {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
    paddingTop: topInset + scale(16),
    paddingLeft: scale(16),
  };
}

export function buildScrollContentStyle(scale: (n: number) => number): ViewStyle {
  return { alignItems: "center", paddingBottom: scale(140) };
}

export function buildAvatarStyle(scale: (n: number) => number, topInset: number): ViewStyle {
  return { paddingTop: topInset + scale(8), paddingBottom: scale(32), alignItems: "center" };
}

export function buildFormStyle(scale: (n: number) => number): ViewStyle {
  return { width: "100%", paddingHorizontal: scale(44) };
}

interface FooterOptions {
  scale: (n: number) => number;
  bottomInset: number;
  colors: SemanticColors;
}

export function buildFooterStyle({ scale, bottomInset, colors }: FooterOptions): ViewStyle {
  return {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(44),
    paddingTop: scale(16),
    paddingBottom: bottomInset + scale(16),
    backgroundColor: colors.secondaryBackground,
  };
}
