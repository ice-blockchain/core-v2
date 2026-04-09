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
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const shadow = useMemo(() => buildHeaderShadowStyle(theme), [theme]);

  return useMemo(() => ({
    screen: [buildScreenContainerStyle(theme), { paddingTop: insets.top }],
    headerWrapper: [
      buildHeaderWrapperStyle(theme),
      isScrolled ? shadow : undefined,
    ],
    header: buildHeaderSectionStyle(theme),
    banner: buildBannerWrapperStyle(theme),
    scrollContent: buildScrollContentStyle(),
    gap: buildGapStyle(theme),
  }), [theme, insets.top, isScrolled, shadow]);
}
