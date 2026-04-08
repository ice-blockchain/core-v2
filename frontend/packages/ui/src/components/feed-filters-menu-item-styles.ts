import type { ViewStyle } from "react-native";

export function buildIconFrameStyle(scale: (n: number) => number, bgColor: string): ViewStyle {
  return {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(9),
    backgroundColor: bgColor,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildFilterIconFrameStyle(options: {
  scale: (n: number) => number;
  bgColor: string;
  borderColor: string;
}): ViewStyle {
  const { scale, bgColor, borderColor } = options;
  return {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(9),
    backgroundColor: bgColor,
    borderWidth: 1,
    borderColor,
    justifyContent: "center",
    alignItems: "center",
  };
}

export function buildRowStyle(scale: (n: number) => number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: scale(4),
    gap: scale(7),
  };
}
