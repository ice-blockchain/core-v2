import type { ImageStyle, ViewStyle } from "react-native";

export function buildRowStyle(): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  };
}

export function buildLeftSectionStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    flex: 1,
  };
}

export function buildAvatarStyle(scale: (n: number) => number, backgroundColor: string): ImageStyle {
  return {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor,
  };
}

export function buildNameRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  };
}
