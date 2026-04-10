import { useEffect } from "react";
import { useNotificationBar, useTheme } from "@ion/ui";
import { setWalletErrorNotifier } from "@ion/wallet";

export function useWalletErrorNotifier() {
  const notificationBar = useNotificationBar();
  const theme = useTheme();
  useEffect(() => {
    setWalletErrorNotifier((message: string) => {
      notificationBar.show({ message, backgroundColor: theme.colors.attentionRed });
    });
  }, [notificationBar, theme.colors.attentionRed]);
}
