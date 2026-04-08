import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../icons/Icon";
import { Text } from "./Text";
import { tabBarStyles, ICON_SIZE } from "./animated-tab-bar-styles";
import type { AnimatedTabDefinition } from "./animated-tab-view-types";
import type { LayoutChangeEvent } from "react-native";

interface AnimatedTabItemProps {
  tab: AnimatedTabDefinition;
  index: number;
  position: SharedValue<number>;
  onPress: (index: number) => void;
  onLayout: (index: number, event: LayoutChangeEvent) => void;
}

function TabLabel({ tab, color }: { tab: AnimatedTabDefinition; color: string }) {
  return (
    <View style={tabBarStyles.tabContent}>
      <Icon name={tab.iconName} size={ICON_SIZE} color={color} />
      <Text variant="subtitle3" color={color}>{tab.label}</Text>
    </View>
  );
}

function useTabItemAnimations(position: SharedValue<number>, index: number) {
  const activeOpacity = useAnimatedStyle(() => {
    "worklet";
    return { opacity: Math.max(0, 1 - Math.abs(position.value - index)) };
  });

  const inactiveOpacity = useAnimatedStyle(() => {
    "worklet";
    return { opacity: 1 - Math.max(0, 1 - Math.abs(position.value - index)) };
  });

  return { activeOpacity, inactiveOpacity };
}

export function AnimatedTabItem({ tab, index, position, onPress, onLayout }: AnimatedTabItemProps) {
  const theme = useTheme();
  const { activeOpacity, inactiveOpacity } = useTabItemAnimations(position, index);
  const handlePress = useCallback(() => onPress(index), [onPress, index]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onLayout(index, event),
    [onLayout, index],
  );

  return (
    <Pressable onPress={handlePress} onLayout={handleLayout} style={tabBarStyles.tabItem} android_ripple={null}>
      <View>
        <Animated.View style={inactiveOpacity}>
          <TabLabel tab={tab} color={theme.colors.tertiaryText} />
        </Animated.View>
        <Animated.View style={[styles.activeLayer, activeOpacity]}>
          <TabLabel tab={tab} color={theme.colors.primaryAccent} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeLayer: { ...StyleSheet.absoluteFillObject },
});
