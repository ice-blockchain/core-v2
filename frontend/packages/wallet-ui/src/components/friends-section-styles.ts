import type { ViewStyle } from "react-native";
import type { useTheme } from "@ion/ui";

type Theme = ReturnType<typeof useTheme>;

export function buildContainerStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    height: scale(140),
    backgroundColor: theme.colors.secondaryBackground,
  };
}

export function buildHeaderStyle(theme: Theme): ViewStyle {
  return {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  };
}

export function buildListContentStyle(theme: Theme): ViewStyle {
  return {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  };
}
