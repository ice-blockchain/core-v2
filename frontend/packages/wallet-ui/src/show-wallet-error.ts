import { notificationBarRef, colorPalette } from "@ion/ui";
import { translate } from "@ion/localization";
import type { WalletActionError } from "@ion/wallet";

export function showWalletError(error: WalletActionError | null | undefined): void {
  const message = error?.userMessage ?? translate("walletUi:unknownWalletError");
  notificationBarRef.show({ message, backgroundColor: colorPalette.raspberry });
}
