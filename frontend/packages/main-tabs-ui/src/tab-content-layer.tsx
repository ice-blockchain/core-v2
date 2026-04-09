import { useMemo } from "react";
import { View } from "react-native";
import type { BottomNavBarTabIndex } from "@ion/ui";
import type { MainShellScreens } from "./types";
import { buildTabLayerStyle } from "./tab-content-styles";

const FILL = { flex: 1 } as const;
const TAB_KEYS: readonly (keyof MainShellScreens)[] = ["Feed", "Chat", "Wallet", "Profile"];

interface TabContentLayerProps {
  screens: MainShellScreens;
  activeTab: BottomNavBarTabIndex;
}

export function TabContentLayer({ screens, activeTab }: TabContentLayerProps) {
  const styles = useMemo(() => TAB_KEYS.map((_, i) => buildTabLayerStyle(i === activeTab)), [activeTab]);

  return (
    <View style={FILL}>
      {TAB_KEYS.map((key, index) => {
        const Screen = screens[key];
        const isActive = index === activeTab;
        if (!isActive) return null;
        return (
          <View key={key} style={styles[index]} pointerEvents="auto">
            <Screen />
          </View>
        );
      })}
    </View>
  );
}
