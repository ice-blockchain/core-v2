import type { ViewStyle } from "react-native";
import type { useTheme } from "@ion/ui";

type Theme = ReturnType<typeof useTheme>;

export function buildPillStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    height: scale(40),
    paddingLeft: scale(6),
    paddingRight: theme.spacing.md,
    borderRadius: theme.radii.medium,
    borderWidth: 1,
    borderColor: theme.colors.onTertiaryFill,
    backgroundColor: theme.colors.tertiaryBackground,
    gap: scale(3),
  };
}

export function buildScanButtonStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    width: scale(40),
    height: scale(40),
    borderRadius: theme.radii.large,
    borderWidth: 1,
    borderColor: theme.colors.onTertiaryFill,
    backgroundColor: theme.colors.tertiaryBackground,
  };
}
