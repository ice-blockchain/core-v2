import { useCallback, useMemo } from "react";
import { MainScreen as MainScreenCore } from "@ion/main-tabs-ui";
import type { SheetActionHandlers } from "@ion/main-tabs-ui";
import { WalletScreen } from "@ion/wallet-ui";

const SCREENS = {
  Feed: WalletScreen,
  Chat: WalletScreen,
  Wallet: WalletScreen,
  Profile: WalletScreen,
};

export function MainScreen() {
  const handleCreatePost = useCallback(() => {}, []);
  const actionHandlers: SheetActionHandlers = useMemo(
    () => ({ onCreatePost: handleCreatePost }),
    [handleCreatePost],
  );

  return <MainScreenCore screens={SCREENS} actionHandlers={actionHandlers} />;
}
