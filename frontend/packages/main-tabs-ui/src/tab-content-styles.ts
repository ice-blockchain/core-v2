import type { ViewStyle } from "react-native";
import { StyleSheet } from "react-native";

export function buildTabLayerStyle(isActive: boolean): ViewStyle {
  return {
    ...StyleSheet.absoluteFillObject,
    opacity: isActive ? 1 : 0,
    pointerEvents: isActive ? "auto" : "none",
  };
}
