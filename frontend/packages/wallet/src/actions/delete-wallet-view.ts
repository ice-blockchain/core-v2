import {
  walletViewStore,
  setWalletViews,
  batchUpdate,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { notifyWalletError } from "../stores/wallet-notification-config";
import type { WalletView } from "../types";

interface DeleteSnapshot {
  previousViews: readonly WalletView[];
  previousActiveId: string;
}

function captureAndRemove(walletId: string): DeleteSnapshot {
  const previousViews = walletViewStore.getWalletViews();
  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const remaining = previousViews.filter((w) => w.id !== walletId);

  if (previousActiveId === walletId && remaining[0]) {
    batchUpdate(remaining, remaining[0].id);
  } else {
    setWalletViews(remaining);
  }

  return { previousViews, previousActiveId };
}

function revertDelete(snapshot: DeleteSnapshot): void {
  batchUpdate(snapshot.previousViews, snapshot.previousActiveId);
}

export function deleteWalletView(walletId: string): void {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);

  if (!wallet) throw new Error("Wallet not found");
  if (wallet.isMain) throw new Error("Cannot delete the main wallet");
  if (current.length <= 1) throw new Error("Cannot delete the last wallet");

  const snapshot = captureAndRemove(walletId);

  if (!wallet.serverId) return;

  const { client, username } = getWalletClient();
  client.deleteWalletView(username, wallet.serverId)
    .catch((error) => {
      revertDelete(snapshot);
      notifyWalletError("Failed to delete wallet");
      console.error("Failed to delete wallet view", error);
    });
}
