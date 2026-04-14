import { useMemo } from "react";
import { View } from "react-native";
import { SkeletonPulse, useTheme } from "@ion/ui";
import { CoinListItemSkeleton } from "./CoinListItemSkeleton";

const SKELETON_ITEM_COUNT = 6;
const SKELETON_ITEMS = Array.from({ length: SKELETON_ITEM_COUNT }, (_, i) => i);

function useSkeletonStyles() {
  const theme = useTheme();
  const { colors } = theme;
  const scale = theme.scale.scaleSize;
  const radius = theme.scale.scaleRadius;

  return useMemo(() => ({
    tabShimmer: {
      backgroundColor: colors.tertiaryBackground,
      borderRadius: radius(16),
      height: scale(24),
      width: "100%" as const,
    },
    gap16: { height: scale(16) },
    gap12: { height: scale(12) },
    subtitleShimmer: {
      backgroundColor: colors.tertiaryBackground,
      borderRadius: radius(16),
      height: scale(16),
      width: "100%" as const,
    },
    manageShimmer: {
      backgroundColor: colors.tertiaryBackground,
      borderRadius: radius(16),
      height: scale(56),
      width: "100%" as const,
    },
  }), [colors.tertiaryBackground, radius, scale]);
}

export function CoinsSectionSkeleton() {
  const s = useSkeletonStyles();

  return (
    <SkeletonPulse>
      <View style={s.tabShimmer} />
      <View style={s.gap16} />
      <View style={s.subtitleShimmer} />
      <View style={s.gap16} />
      {SKELETON_ITEMS.map((index) => (
        <View key={index}>
          {index > 0 && <View style={s.gap12} />}
          <CoinListItemSkeleton />
        </View>
      ))}
      <View style={s.gap16} />
      <View style={s.manageShimmer} />
    </SkeletonPulse>
  );
}
