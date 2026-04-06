import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { BottomNavBar } from "../components/BottomNavBar";
import { BottomNavBarSheet } from "../components/BottomNavBarSheet";
import { colorPalette } from "../tokens/color-palette";
import type { BottomNavBarTabIndex, BottomNavBarSheetAction } from "../components/bottom-nav-bar-types";
import { CatalogSection } from "./CatalogSection";

function buildSheetConfigs(successColor: string) {
  const feedActions: BottomNavBarSheetAction[] = [
    { iconName: "feed-post", iconBackgroundColor: colorPalette.purple, title: "Post", description: "Voice your ideas", onPress: noop },
    { iconName: "feed-stories", iconBackgroundColor: colorPalette.orangePeel, title: "Story", description: "Express the moment", onPress: noop },
    { iconName: "videos-trading", iconBackgroundColor: colorPalette.raspberry, title: "Video", description: "Show the world in motion", onPress: noop },
    { iconName: "articles", iconBackgroundColor: successColor, title: "Article", description: "Share your wisdom", onPress: noop },
  ];
  const chatActions: BottomNavBarSheetAction[] = [
    { iconName: "chat-createnew", iconBackgroundColor: colorPalette.orangePeel, title: "New chat", description: "Start a private, one-on-one chat", onPress: noop },
  ];
  const walletActions: BottomNavBarSheetAction[] = [
    { iconName: "send", iconBackgroundColor: colorPalette.orangePeel, title: "Send", description: "Send funds quickly and securely", onPress: noop },
    { iconName: "button-receive", iconBackgroundColor: successColor, title: "Receive", description: "Securely receive funds with one tap", onPress: noop },
    { iconName: "swap", iconBackgroundColor: colorPalette.purple, title: "Swap", description: "Swapping is even easier than it seems", onPress: noop },
  ];
  return {
    0: { title: "Create value", actions: feedActions },
    1: { title: "Start conversation", actions: chatActions },
    2: { title: "Wallet", actions: walletActions },
    3: { title: "Create value", actions: feedActions },
  } as Record<BottomNavBarTabIndex, { title: string; actions: BottomNavBarSheetAction[] }>;
}

function noop() {}

function useNavBarState() {
  const [activeTab, setActiveTab] = useState<BottomNavBarTabIndex>(0);
  const [isSheetOpen, setSheetOpen] = useState(false);

  function handleCenterPress() {
    setSheetOpen((prev) => !prev);
  }

  return { activeTab, setActiveTab, isSheetOpen, setSheetOpen, handleCenterPress };
}

export function BottomNavBarCatalogSection() {
  const theme = useTheme();
  const { activeTab, setActiveTab, isSheetOpen, setSheetOpen, handleCenterPress } = useNavBarState();
  const sheetConfigs = buildSheetConfigs(theme.colors.success);
  const sheetConfig = sheetConfigs[activeTab];

  return (
    <CatalogSection title="Bottom Nav Bar">
      <View style={{ borderRadius: theme.radii.medium, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.strokeElements }}>
        <BottomNavBar
          activeTab={activeTab}
          onTabPress={setActiveTab}
          onCenterPress={handleCenterPress}
          isCenterModalOpen={isSheetOpen}
          tabs={[
            { label: "Feed", iconName: "home-off" },
            { label: "Chat", iconName: "chat-off", badgeCount: 14 },
            { label: "Wallet", iconName: "wallet-off", badgeCount: 99 },
            { label: "Profile", avatar: {} },
          ]}
        />
      </View>
      <BottomNavBarSheet
        isVisible={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetConfig.title}
        actions={sheetConfig.actions}
      />
    </CatalogSection>
  );
}
