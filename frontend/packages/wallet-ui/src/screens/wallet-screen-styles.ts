import type { ViewStyle } from "react-native";
import type { useTheme } from "@ion/ui";

type Theme = ReturnType<typeof useTheme>;

export function buildScreenContainerStyle(theme: Theme): ViewStyle {
  return { flex: 1, backgroundColor: theme.colors.secondaryBackground };
}

export function buildHeaderSectionStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    backgroundColor: theme.colors.secondaryBackground,
    paddingTop: theme.spacing.sm,
    paddingBottom: scale(18),
    gap: scale(14),
  };
}

export function buildBannerWrapperStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.secondaryBackground,
    paddingVertical: theme.spacing.lg,
  };
}

export function buildScrollContentStyle(): ViewStyle {
  return { paddingBottom: 0 };
}

export function buildHeaderWrapperStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.secondaryBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  };
}

export function buildHeaderShadowStyle(theme: Theme): ViewStyle {
  const scale = theme.scale.scaleSize;
  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 1,
    shadowRadius: scale(10),
    elevation: 3,
  };
}

export function buildGapStyle(theme: Theme): ViewStyle {
  return { gap: theme.spacing.xs, backgroundColor: theme.colors.primaryBackground };
}
