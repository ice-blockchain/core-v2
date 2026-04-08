import { ScrollView, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { tabBarStyles } from "./animated-tab-bar-styles";
import { useTabLayouts } from "./use-tab-layouts";
import { AnimatedTabItem } from "./AnimatedTabItem";
import { AnimatedTabIndicator } from "./AnimatedTabIndicator";
import type { AnimatedTabBarProps } from "./animated-tab-view-types";

export function AnimatedTabBar({ tabs, position, onTabPress, style }: AnimatedTabBarProps) {
  const theme = useTheme();
  const { tabLayouts, handleTabLayout } = useTabLayouts(tabs.length);

  return (
    <View style={[tabBarStyles.container, { backgroundColor: theme.colors.secondaryBackground }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabBarStyles.scrollContent}
      >
        {tabs.map((tab, index) => (
          <AnimatedTabItem
            key={tab.key}
            tab={tab}
            index={index}
            position={position}
            onPress={onTabPress}
            onLayout={handleTabLayout}
          />
        ))}
        <AnimatedTabIndicator position={position} tabLayouts={tabLayouts} />
      </ScrollView>
    </View>
  );
}
