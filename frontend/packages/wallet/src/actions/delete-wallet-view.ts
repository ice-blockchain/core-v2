import {
  walletViewStore,
  setWalletViews,
  batchUpdate,
} from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode, type WalletActionResult } from "../errors";
import { walletErrorResult, walletSuccess } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import type { WalletView } from "../types";

interface DeleteSnapshot {
  deletedView: WalletView;
  previousActiveId: string;
}

function captureAndRemove(wallet: WalletView): DeleteSnapshot {
  const previousViews = walletViewStore.getWalletViews();
  const previousActiveId = walletViewStore.getActiveWalletViewId();
  const remaining = previousViews.filter((w) => w.id !== wallet.id);

  if (previousActiveId === wallet.id && remaining[0]) {
    batchUpdate(remaining, remaining[0].id);
  } else {
    setWalletViews(remaining);
  }

  return { deletedView: wallet, previousActiveId };
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

function validateDelete(walletId: string): WalletActionResult<WalletView> {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) return walletErrorResult(WalletErrorCode.WALLET_NOT_FOUND);
  if (wallet.isMain) return walletErrorResult(WalletErrorCode.CANNOT_DELETE_MAIN);
  if (current.length <= 1) return walletErrorResult(WalletErrorCode.CANNOT_DELETE_LAST);
  return walletSuccess(wallet);
}

export async function deleteWalletView(walletId: string): Promise<WalletActionResult> {
  const validation = validateDelete(walletId);
  if (validation.outcome === "error") return validation;
  const wallet = validation.value;

  const snapshot = captureAndRemove(wallet);
  if (!wallet.serverId) return walletSuccess(undefined);

  try {
    const { client, username } = getWalletClient();
    await client.deleteWalletView(username, wallet.serverId);
    return walletSuccess(undefined);
  } catch (error) {
    revertDelete(snapshot);
    Logger.error("Failed to delete wallet view", {
      tag: "wallet",
      error: error instanceof Error ? error : new Error(String(error)),
      data: { walletId },
    });
    return walletErrorResult(WalletErrorCode.DELETE_FAILED);
  }
}
