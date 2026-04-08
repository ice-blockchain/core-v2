import { useCallback, useMemo } from "react";
import { MainScreen } from "@ion/main-tabs-ui";
import type { SheetActionHandlers } from "@ion/main-tabs-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { FeedScreen } from "@ion/feed-ui";
import { ChatTabScreen } from "./chat-tab-screen";
import { WalletScreen } from "@ion/wallet-ui";
import { ProfileScreen } from "@ion/profile-ui";

const SCREENS = {
  Feed: FeedScreen,
  Chat: ChatTabScreen,
  Wallet: WalletScreen,
  Profile: ProfileScreen,
};

export function HomeScreen() {
  const navigation = useAppNavigation();

  const handleCreatePost = useCallback(() => {
    navigation.navigate(Routes.Sheet.CreatePost);
  }, [navigation]);

  const actionHandlers: SheetActionHandlers = useMemo(
    () => ({ onCreatePost: handleCreatePost }),
    [handleCreatePost],
  );

  return <MainScreen screens={SCREENS} actionHandlers={actionHandlers} />;
}
