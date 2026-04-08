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
  const { colors, scale: { scaleSize: scale } } = useTheme();
  return useMemo(() => ({
    container: buildContainerStyle(scale, colors),
    emptyImage: buildEmptyImageStyle(scale),
    emptyState: buildEmptyStateStyle(scale),
    page: { width: pageWidth },
  }), [scale, colors, pageWidth]);
}
