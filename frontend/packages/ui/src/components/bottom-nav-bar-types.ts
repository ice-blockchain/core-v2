import type { ReactNode } from "react";
import type { IconName } from "../icons/icon-types";

export type BottomNavBarTabIndex = 0 | 1 | 2 | 3;

export interface BottomNavBarTabConfig {
  label: string;
  iconName?: IconName;
  badgeCount?: number;
  avatar?: {
    imageUrl?: string;
    fallback?: ReactNode;
  };
}

export interface BottomNavBarProps {
  activeTab: BottomNavBarTabIndex;
  onTabPress: (index: BottomNavBarTabIndex) => void;
  onCenterPress: () => void;
  isCenterModalOpen: boolean;
  tabs: readonly [BottomNavBarTabConfig, BottomNavBarTabConfig, BottomNavBarTabConfig, BottomNavBarTabConfig];
  testID?: string;
}

export interface BottomNavBarSheetAction {
  iconName: IconName;
  iconBackgroundColor: string;
  title: string;
  description: string;
  onPress: () => void;
  testID?: string;
}

export interface BottomNavBarSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  actions: readonly BottomNavBarSheetAction[];
  inline?: boolean;
  testID?: string;
}
