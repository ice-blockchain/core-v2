import type { ViewStyle } from "react-native";
import type { StoryAvatarStyleOptions } from "./story-avatar-types";

export function buildRingContainerStyle(options: StoryAvatarStyleOptions): ViewStyle {
  const { size, borderRadius, scale } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildSolidRingStyle(options: StoryAvatarStyleOptions): ViewStyle {
  const { size, borderRadius, ringWidth, scale, colors } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
    borderWidth: scale(ringWidth),
    borderColor: colors.sheetLine,
    position: "absolute",
  };
}

export function buildBadgeOverlayStyle(options: StoryAvatarStyleOptions): ViewStyle {
  const { size, scale } = options;
  return {
    position: "absolute",
    width: scale(size),
    height: scale(size),
    top: 0,
    left: 0,
  };
}
