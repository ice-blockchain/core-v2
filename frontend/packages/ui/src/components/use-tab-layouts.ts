import { useCallback, useRef } from "react";
import { useSharedValue } from "react-native-reanimated";
import type { LayoutChangeEvent } from "react-native";

export interface TabLayout {
  x: number;
  width: number;
}

const EMPTY_LAYOUTS: TabLayout[] = [];

export function useTabLayouts(tabCount: number) {
  const tabLayouts = useSharedValue<TabLayout[]>(EMPTY_LAYOUTS);
  const pendingLayouts = useRef<(TabLayout | null)[]>(
    Array.from({ length: tabCount }, () => null),
  );

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      pendingLayouts.current[index] = { x, width };

      const allMeasured = pendingLayouts.current.every(Boolean);
      if (allMeasured) {
        tabLayouts.value = pendingLayouts.current as TabLayout[];
      }
    },
    [tabLayouts],
  );

  return { tabLayouts, handleTabLayout };
}
