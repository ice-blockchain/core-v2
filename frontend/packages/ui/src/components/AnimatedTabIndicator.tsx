import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { tabBarStyles } from "./animated-tab-bar-styles";
import type { TabLayout } from "./use-tab-layouts";

interface AnimatedTabIndicatorProps {
  position: SharedValue<number>;
  tabLayouts: SharedValue<TabLayout[]>;
}

export function AnimatedTabIndicator({ position, tabLayouts }: AnimatedTabIndicatorProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const layouts = tabLayouts.value;
    if (layouts.length === 0) {
      return { opacity: 0 };
    }

    const pos = Math.max(0, Math.min(position.value, layouts.length - 1));
    const floor = Math.floor(pos);
    const fraction = pos - floor;
    const left = layouts[floor];
    const right = layouts[Math.min(floor + 1, layouts.length - 1)];

    if (!left || !right) {
      return { opacity: 0 };
    }

    const x = left.x + (right.x - left.x) * fraction;
    const width = left.width + (right.width - left.width) * fraction;

    return {
      opacity: 1,
      transform: [{ translateX: x }],
      width,
      backgroundColor: theme.colors.primaryAccent,
    };
  });

  return <Animated.View style={[tabBarStyles.indicator, animatedStyle]} />;
}
