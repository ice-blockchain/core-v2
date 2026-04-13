import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";
import { buildWalletActionError } from "../error-messages";
import { Logger } from "@ion/diagnostics";

export function renameWalletView(walletId: string, newName: string): Promise<void> {
  const trimmedName = newName.trim();
  if (!trimmedName) throw buildWalletActionError(WalletErrorCode.NAME_EMPTY);

  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) throw buildWalletActionError(WalletErrorCode.WALLET_NOT_FOUND);

  const previousName = wallet.name;
  setWalletViews(current.map((w) => (w.id === walletId ? { ...w, name: trimmedName } : w)));

  if (!wallet.serverId) return Promise.resolve();

  const { client, username } = getWalletClient();
  const input = { name: trimmedName, items: [...wallet.originalItems], symbolGroups: [...wallet.originalSymbolGroups] };
  return client.updateWalletView(username, wallet.serverId, input)
    .then(() => undefined)
    .catch((error: unknown) => {
      const views = walletViewStore.getWalletViews();
      const currentView = views.find((w) => w.id === walletId);
      if (currentView && currentView.name === trimmedName) {
        setWalletViews(views.map((w) => (w.id === walletId ? { ...w, name: previousName } : w)));
      }
      Logger.error("Failed to rename wallet view", {
        tag: "wallet",
        error: error instanceof Error ? error : new Error(String(error)),
        data: { walletId, newName: trimmedName },
      });
      throw buildWalletActionError(WalletErrorCode.RENAME_FAILED);
    });
}
