import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@ion/ui";
import { buildScreenStyle, buildSearchContainerStyle } from "./empty-conversations-styles";

export function useEditScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  return {
    screen: useMemo(() => [buildScreenStyle(theme.colors.secondaryBackground), { paddingTop: insets.top }], [theme.colors.secondaryBackground, insets.top]),
    searchContainer: useMemo(() => buildSearchContainerStyle(scale), [scale]),
    content: useMemo(() => ({ paddingHorizontal: scale(16) }), [scale]),
    bottomPadding: useMemo(() => ({ paddingBottom: insets.bottom }), [insets.bottom]),
  };
}
