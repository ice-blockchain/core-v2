import { useCallback, useMemo } from "react";
import { MainScreen as MainScreenCore } from "@ion/main-tabs-ui";
import type { SheetActionHandlers } from "@ion/main-tabs-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { FeedScreen } from "@ion/feed-ui";
import { ChatTabScreen } from "./chat-tab-screen";
import { WalletScreen } from "@ion/wallet-ui";
import { ProfilePlaceholder } from "./placeholders/profile-placeholder";

const SCREENS = {
  Feed: FeedScreen,
  Chat: ChatTabScreen,
  Wallet: WalletScreen,
  Profile: ProfilePlaceholder,
};

export function MainScreen() {
  const navigation = useAppNavigation();

  const handleCreatePost = useCallback(() => {
    navigation.navigate(Routes.Sheet.CreatePost);
  }, [navigation]);

  const actionHandlers: SheetActionHandlers = useMemo(
    () => ({ onCreatePost: handleCreatePost }),
    [handleCreatePost],
  );

  return <MainScreenCore screens={SCREENS} actionHandlers={actionHandlers} />;
}
