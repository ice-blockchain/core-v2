import type { ViewStyle } from "react-native";
import { MENU_WIDTH } from "./overlay-menu-types";

export function buildContainerStyle(options: {
  scale: (n: number) => number;
  bgColor: string;
  width?: number | undefined;
}): ViewStyle {
  const { scale, bgColor, width } = options;
  return {
    width: scale(width ?? MENU_WIDTH),
    backgroundColor: bgColor,
    borderRadius: scale(16),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  };
}

export function buildBackdropStyle(): ViewStyle {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };
}
