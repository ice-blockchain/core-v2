import type { ViewStyle } from "react-native";
import type { SemanticColors } from "../theme/theme-types";

interface PickerStyleOptions {
  size: number;
  borderRadius: number;
  scale: (n: number) => number;
  colors: SemanticColors;
}

export function buildPickerContainerStyle(options: PickerStyleOptions): ViewStyle {
  const { size, borderRadius, scale, colors } = options;
  return {
    width: scale(size),
    height: scale(size),
    borderRadius: scale(borderRadius),
    backgroundColor: colors.strokeElements + "4D",
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildPlaceholderStyle(options: PickerStyleOptions): ViewStyle {
  const { size, borderRadius, scale, colors } = options;
  const innerSize = size * 0.76;
  const innerRadius = borderRadius * 0.6;
  return {
    width: scale(innerSize),
    height: scale(innerSize),
    borderRadius: scale(innerRadius),
    borderWidth: 2,
    borderColor: colors.onPrimaryAccent,
    borderStyle: "dashed",
  };
}

export function buildCameraButtonStyle(options: PickerStyleOptions & { buttonSize: number }): ViewStyle {
  const { buttonSize, scale, colors } = options;
  return {
    position: "absolute",
    bottom: scale(-6),
    right: scale(-6),
    width: scale(buttonSize),
    height: scale(buttonSize),
    borderRadius: scale(buttonSize / 2),
    backgroundColor: colors.primaryAccent,
    justifyContent: "center",
    alignItems: "center",
  };
}
