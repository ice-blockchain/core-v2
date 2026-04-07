import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BottomNavBar, BottomNavBarSheet, useTheme } from "@ion/ui";
import type { BottomNavBarTabConfig } from "@ion/ui";
import { translate } from "@ion/localization";
import type { MainShellScreens } from "./types";
import { TabContentLayer } from "./tab-content-layer";
import { useMainTabState } from "./use-main-tab-state";
import { buildSheetConfigs } from "./sheet-action-configs";
import type { SheetActionHandlers } from "./sheet-action-configs";
import { MAIN_SHELL_NAMESPACE } from "./translations";

const NS = MAIN_SHELL_NAMESPACE;

function buildTabConfigs(): readonly [BottomNavBarTabConfig, BottomNavBarTabConfig, BottomNavBarTabConfig, BottomNavBarTabConfig] {
  return [
    { label: translate(`${NS}:feedTab`), iconName: "home-off" as const },
    { label: translate(`${NS}:chatTab`), iconName: "chat-off" as const },
    { label: translate(`${NS}:walletTab`), iconName: "wallet-off" as const },
    { label: translate(`${NS}:profileTab`), avatar: {} },
  ];
}

interface MainScreenProps {
  screens: MainShellScreens;
  actionHandlers?: SheetActionHandlers;
}

export function MainScreen({ screens, actionHandlers }: MainScreenProps) {
  const theme = useTheme();
  const { activeTab, isSheetOpen, handleTabPress, handleCenterPress, handleSheetClose } = useMainTabState();
  const sheetConfigs = useMemo(() => buildSheetConfigs(theme.colors.success, actionHandlers), [theme.colors.success, actionHandlers]);
  const sheetConfig = sheetConfigs[activeTab];
  const tabConfigs = buildTabConfigs();

  return (
    <View style={styles.root}>
      <View style={styles.contentArea}>
        <TabContentLayer screens={screens} activeTab={activeTab} />
        <BottomNavBarSheet isVisible={isSheetOpen} onClose={handleSheetClose} title={sheetConfig.title} actions={sheetConfig.actions} inline />
      </View>
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} onCenterPress={handleCenterPress} isCenterModalOpen={isSheetOpen} tabs={tabConfigs} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  contentArea: { flex: 1, overflow: "hidden" },
});
