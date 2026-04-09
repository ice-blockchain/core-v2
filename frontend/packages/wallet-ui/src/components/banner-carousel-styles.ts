import { StyleSheet } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";
import type { useTheme } from "@ion/ui";

type Theme = ReturnType<typeof useTheme>;

export function buildCardContainerStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    height: scale(120),
    borderRadius: theme.radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.onTertiaryFill,
    backgroundColor: theme.colors.tertiaryBackground,
    overflow: "hidden",
  };
}

export function buildTextBlockStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    left: theme.spacing.xl,
    width: scale(208),
    gap: theme.spacing.sm,
  };
}

export function buildCardImageStyle(theme: Theme): ImageStyle {
  const scale = theme.scale.scaleSize;
  return {
    width: scale(80),
    height: scale(80),
    top: theme.spacing.xl,
    right: theme.spacing.xl,
  };
}

export function buildDotsContainerStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    marginTop: scale(9),
    gap: theme.spacing.xs,
  };
}

export function buildActiveDotStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    width: scale(12),
    height: scale(3),
    borderRadius: theme.scale.scaleRadius(2),
    backgroundColor: theme.colors.primaryAccent,
  };
}

export function buildInactiveDotStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    width: scale(6),
    height: scale(3),
    borderRadius: theme.scale.scaleRadius(2),
    backgroundColor: theme.colors.onTertiaryFill,
  };
}

export function buildDotsInsideStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    position: "absolute",
    bottom: scale(9.5),
    left: 0,
    right: 0,
    gap: theme.spacing.xs,
  };
}

export function buildCarouselPaddingStyle(theme: Theme): ViewStyle {
  return {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.md,
  };
}
