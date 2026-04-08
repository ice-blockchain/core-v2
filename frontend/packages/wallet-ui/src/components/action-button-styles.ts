import type { ViewStyle } from "react-native";

interface BuildIconStyleOptions {
  scale: (n: number) => number;
  scaleRadius: (n: number) => number;
  filled: boolean | undefined;
  colors: { primaryAccent: string; onTertiaryFill: string };
}

export function buildIconContainerStyle(options: BuildIconStyleOptions): ViewStyle {
  const { scale, scaleRadius, filled, colors } = options;
  return {
    width: scale(48),
    height: scale(48),
    borderRadius: scaleRadius(14),
    backgroundColor: filled ? colors.primaryAccent : undefined,
    borderWidth: filled ? 0 : 1,
    borderColor: filled ? undefined : colors.onTertiaryFill,
  };
}
