import type { ImageStyle, ViewStyle } from "react-native";
import type { useTheme } from "@ion/ui";

type Theme = ReturnType<typeof useTheme>;

export function buildContainerStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.secondaryBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  };
}

export function buildEmptyImageStyle(theme: Theme): ImageStyle {
  const scale = theme.scale.scaleSize;
  return { width: scale(48), height: scale(48) };
}

export function buildEmptyStateStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    gap: theme.spacing.sm,
    paddingVertical: scale(65),
  };
}
