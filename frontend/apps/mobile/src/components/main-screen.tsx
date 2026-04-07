import { useCallback, useMemo } from "react";
import { MainScreen as MainScreenCore } from "@ion/main-tabs-ui";
import type { SheetActionHandlers } from "@ion/main-tabs-ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { FeedPlaceholder } from "./placeholders/feed-placeholder";
import { ChatTabScreen } from "./chat-tab-screen";
import { WalletPlaceholder } from "./placeholders/wallet-placeholder";
import { ProfilePlaceholder } from "./placeholders/profile-placeholder";

const SCREENS = {
  Feed: FeedPlaceholder,
  Chat: ChatTabScreen,
  Wallet: WalletPlaceholder,
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
