import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@ion/ui";
import {
  buildScreenContainerStyle,
  buildHeaderSectionStyle,
  buildBannerWrapperStyle,
  buildScrollContentStyle,
  buildHeaderWrapperStyle,
  buildHeaderShadowStyle,
  buildGapStyle,
} from "./wallet-screen-styles";

export function useWalletScreenStyles(isScrolled: boolean) {
  const { colors, scale: { scaleSize: scale } } = useTheme();
  const insets = useSafeAreaInsets();

  const shadow = useMemo(
    () => buildHeaderShadowStyle(scale, colors),
    [scale, colors],
  );

  return useMemo(() => ({
    screen: [buildScreenContainerStyle(colors), { paddingTop: insets.top }],
    headerWrapper: [
      buildHeaderWrapperStyle(scale, colors),
      isScrolled ? shadow : undefined,
    ],
    header: buildHeaderSectionStyle(scale, colors),
    banner: buildBannerWrapperStyle(scale, colors),
    scrollContent: buildScrollContentStyle(),
    gap: buildGapStyle(scale, colors),
  }), [colors, scale, insets.top, isScrolled, shadow]);
}
