import { memo, useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "@ion/ui";

function CoinListItemSkeletonComponent() {
  const theme = useTheme();
  const { colors } = theme;
  const scale = theme.scale.scaleSize;
  const radius = theme.scale.scaleRadius;

  const style = useMemo(() => ({
    backgroundColor: colors.tertiaryBackground,
    borderRadius: radius(16),
    height: scale(60),
    width: "100%" as const,
  }), [colors.tertiaryBackground, radius, scale]);

  return <View style={style} />;
}

export const CoinListItemSkeleton = memo(CoinListItemSkeletonComponent);
