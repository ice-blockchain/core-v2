import type { ViewStyle } from "react-native";
import type { SemanticColors } from "@ion/ui";

export function buildAvatarContainerStyle(scale: (n: number) => number, colors: SemanticColors): ViewStyle {
  return {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(20),
    backgroundColor: colors.strokeElements + "4D",
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildDashedPlaceholderStyle(scale: (n: number) => number, colors: SemanticColors): ViewStyle {
  return {
    width: scale(76),
    height: scale(76),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.onPrimaryAccent,
    borderStyle: "dashed",
  };
}

export function buildCameraButtonStyle(scale: (n: number) => number, colors: SemanticColors): ViewStyle {
  return {
    position: "absolute",
    bottom: scale(-6),
    right: scale(-6),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.primaryAccent,
    justifyContent: "center",
    alignItems: "center",
  };
}
