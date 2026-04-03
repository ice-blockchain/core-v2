import type { ImageStyle, ViewStyle } from "react-native";
import type { SemanticColors } from "../theme/theme-types";

interface AvatarStyleOptions {
  size: number;
  borderRadius: number;
  scale: (n: number) => number;
  colors: SemanticColors;
}

export function buildContainerStyle(options: AvatarStyleOptions): ViewStyle {
  const { size, borderRadius, scale } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
  };
}

export function buildImageStyle(options: AvatarStyleOptions & { contentFit: "cover" | "contain" }): ImageStyle {
  const { size, borderRadius, scale, contentFit } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
    resizeMode: contentFit,
    overflow: "hidden",
  };
}

export function buildFallbackStyle(options: AvatarStyleOptions): ViewStyle {
  const { size, borderRadius, scale, colors } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
    backgroundColor: colors.onTertiaryFill,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };
}

export function buildBadgeOverlayStyle(options: AvatarStyleOptions): ViewStyle {
  const { size, scale } = options;
  return {
    position: "absolute",
    width: scale(size),
    height: scale(size),
    top: 0,
    left: 0,
  };
}
