import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { notifyWalletError } from "../stores/wallet-notification-config";

export function renameWalletView(walletId: string, newName: string): void {
  const trimmedName = newName.trim();
  if (!trimmedName) throw new Error("Wallet name cannot be empty");

  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) throw new Error("Wallet not found");

  const previousName = wallet.name;
  setWalletViews(current.map((w) => (w.id === walletId ? { ...w, name: trimmedName } : w)));

  if (!wallet.serverId) return;

  const { client, username } = getWalletClient();
  const input = { name: trimmedName, items: [...wallet.originalItems], symbolGroups: [...wallet.originalSymbolGroups] };
  client.updateWalletView(username, wallet.serverId, input)
    .catch((error) => {
      const views = walletViewStore.getWalletViews();
      const current = views.find((w) => w.id === walletId);
      if (current && current.name === trimmedName) {
        setWalletViews(views.map((w) => (w.id === walletId ? { ...w, name: previousName } : w)));
      }
      notifyWalletError("Failed to rename wallet");
      console.error("Failed to rename wallet view", error);
    });
}
