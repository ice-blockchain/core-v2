import {
  walletViewStore,
  setWalletViews,
  batchUpdate,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";
import { buildWalletActionError } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import type { WalletView } from "../types";

interface DeleteSnapshot {
  deletedView: WalletView;
  previousActiveId: string;
}

function captureAndRemove(walletId: string): DeleteSnapshot {
  const previousViews = walletViewStore.getWalletViews();
  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const deletedView = previousViews.find((w) => w.id === walletId)!;
  const remaining = previousViews.filter((w) => w.id !== walletId);

  if (previousActiveId === walletId && remaining[0]) {
    batchUpdate(remaining, remaining[0].id);
  } else {
    setWalletViews(remaining);
  }

  return { deletedView, previousActiveId };
}

function revertDelete(snapshot: DeleteSnapshot): void {
  const currentViews = walletViewStore.getWalletViews();
  const currentActiveId = walletViewStore.getActiveWalletViewId();
  const alreadyExists = currentViews.some((v) => v.id === snapshot.deletedView.id);
  if (alreadyExists) return;

  const restoredViews = [...currentViews, snapshot.deletedView];
  const activeId = currentActiveId === snapshot.previousActiveId || !currentActiveId
    ? snapshot.previousActiveId
    : currentActiveId;
  batchUpdate(restoredViews, activeId);
}

export function deleteWalletView(walletId: string): Promise<void> {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);

  if (!wallet) throw buildWalletActionError(WalletErrorCode.WALLET_NOT_FOUND);
  if (wallet.isMain) throw buildWalletActionError(WalletErrorCode.CANNOT_DELETE_MAIN);
  if (current.length <= 1) throw buildWalletActionError(WalletErrorCode.CANNOT_DELETE_LAST);

  const snapshot = captureAndRemove(walletId);

  if (!wallet.serverId) return Promise.resolve();

  const { client, username } = getWalletClient();
  return client.deleteWalletView(username, wallet.serverId)
    .catch((error: unknown) => {
      revertDelete(snapshot);
      Logger.error("Failed to delete wallet view", {
        tag: "wallet",
        error: error instanceof Error ? error : new Error(String(error)),
        data: { walletId },
      });
      throw buildWalletActionError(WalletErrorCode.DELETE_FAILED);
    });
}
