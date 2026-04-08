import { useMemo } from "react";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useTheme, colorPalette } from "@ion/ui";

const SCROLL_THRESHOLD = 60;
const SNAP_THRESHOLD = 30;

export function useProfileScrollAnimation() {
  const theme = useTheme();
  const scrollOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollOffset.value = event.contentOffset.y;
  });

  const collapsedHeaderOpacity = useDerivedValue(() => {
    "worklet";
    return Math.min(Math.max(scrollOffset.value / SCROLL_THRESHOLD, 0), 1);
  });

  const navBarBgStyle = useAnimatedStyle(() => {
    "worklet";
    const isOpaque = scrollOffset.value >= SNAP_THRESHOLD;
    return {
      backgroundColor: isOpaque ? theme.colors.secondaryBackground : "transparent",
      shadowColor: colorPalette.darkBlue,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isOpaque ? 0.03 : 0,
      shadowRadius: 10,
      elevation: isOpaque ? 3 : 0,
    };
  }, [scrollOffset, theme.colors.secondaryBackground]);

  return useMemo(
    () => ({ scrollOffset, scrollHandler, collapsedHeaderOpacity, navBarBgStyle, AnimatedScrollView: Animated.ScrollView }),
    [scrollOffset, scrollHandler, collapsedHeaderOpacity, navBarBgStyle],
  );
}
