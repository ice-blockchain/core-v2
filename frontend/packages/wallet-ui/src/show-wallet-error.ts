import { notificationBarRef, colorPalette } from "@ion/ui";
import { translate } from "@ion/localization";
import { ActionError } from "@ion/wallet";

export function showWalletError(error: unknown): void {
  const userMessage = error instanceof ActionError
    ? error.userMessage
    : translate("walletUi:unknownWalletError");
  notificationBarRef.show({ message: userMessage, backgroundColor: colorPalette.raspberry });
}
