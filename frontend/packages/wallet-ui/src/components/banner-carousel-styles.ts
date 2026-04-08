import { StyleSheet } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";

interface ThemeColors {
  onTertiaryFill: string;
  tertiaryBackground: string;
  primaryAccent: string;
}

export function buildCardContainerStyle(
  scale: (n: number) => number,
  scaleRadius: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    height: scale(120),
    borderRadius: scaleRadius(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onTertiaryFill,
    backgroundColor: colors.tertiaryBackground,
    overflow: "hidden",
  };
}

export function buildTextBlockStyle(
  scale: (n: number) => number,
): ViewStyle {
  return {
    left: scale(20),
    width: scale(208),
    gap: scale(8),
  };
}

export function buildCardImageStyle(
  scale: (n: number) => number,
): ImageStyle {
  return {
    width: scale(80),
    height: scale(80),
    top: scale(20),
    right: scale(20),
  };
}

export function buildDotsContainerStyle(
  scale: (n: number) => number,
): ViewStyle {
  return {
    marginTop: scale(9),
    gap: scale(4),
  };
}

export function buildActiveDotStyle(
  scale: (n: number) => number,
  scaleRadius: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    width: scale(12),
    height: scale(3),
    borderRadius: scaleRadius(2),
    backgroundColor: colors.primaryAccent,
  };
}

export function buildInactiveDotStyle(
  scale: (n: number) => number,
  scaleRadius: (n: number) => number,
  colors: ThemeColors,
): ViewStyle {
  return {
    width: scale(6),
    height: scale(3),
    borderRadius: scaleRadius(2),
    backgroundColor: colors.onTertiaryFill,
  };
}

export function buildDotsInsideStyle(
  scale: (n: number) => number,
): ViewStyle {
  return {
    position: "absolute",
    bottom: scale(9.5),
    left: 0,
    right: 0,
    gap: scale(4),
  };
}

export function buildCarouselPaddingStyle(
  scale: (n: number) => number,
): ViewStyle {
  return { paddingLeft: scale(16), paddingRight: scale(16), gap: scale(12) };
}
