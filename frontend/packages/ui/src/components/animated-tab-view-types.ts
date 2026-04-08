import type { ReactNode, RefObject } from "react";
import type { ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type PagerView from "react-native-pager-view";
import type { IconName } from "../icons/Icon";

export interface AnimatedTabDefinition {
  key: string;
  label: string;
  iconName: IconName;
}

export interface AnimatedTabBarProps {
  tabs: readonly AnimatedTabDefinition[];
  position: SharedValue<number>;
  onTabPress: (index: number) => void;
  style?: ViewStyle | ViewStyle[];
}

export interface AnimatedTabPagerProps {
  children: ReactNode[];
  position: SharedValue<number>;
  onPageSelected?: (index: number) => void;
  style?: ViewStyle;
}

export interface TabViewState {
  position: SharedValue<number>;
  currentIndex: SharedValue<number>;
  pagerRef: RefObject<PagerView | null>;
  setPage: (index: number) => void;
}
