import { useMemo } from "react";
import type { ImageStyle, ViewStyle } from "react-native";
import { useTheme } from "@ion/ui";
import { buildContainerStyle, buildEmptyImageStyle, buildEmptyStateStyle } from "./coins-section-styles";

interface CoinsSectionStyles {
  container: ViewStyle;
  emptyImage: ImageStyle;
  emptyState: ViewStyle;
  page: ViewStyle;
}

export function useCoinsSectionStyles(pageWidth: number): CoinsSectionStyles {
  const theme = useTheme();
  return useMemo(() => ({
    container: buildContainerStyle(theme),
    emptyImage: buildEmptyImageStyle(theme),
    emptyState: buildEmptyStateStyle(theme),
    page: { width: pageWidth },
  }), [theme, pageWidth]);
}
