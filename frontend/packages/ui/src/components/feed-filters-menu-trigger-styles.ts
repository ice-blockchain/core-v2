import type { ViewStyle } from "react-native";

export function buildTriggerStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(16),
    backgroundColor: bgColor,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildBadgeStyle(scale: (n: number) => number, bgColor: string, borderColor: string): ViewStyle {
  return {
    position: "absolute",
    bottom: scale(-3),
    right: scale(-3),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: bgColor,
    borderWidth: 1,
    borderColor,
    justifyContent: "center",
    alignItems: "center",
  };
}
