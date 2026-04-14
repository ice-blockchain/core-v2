import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { getWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode, type WalletActionResult } from "../errors";
import { walletErrorResult, walletSuccess } from "../error-messages";
import { Logger } from "@ion/diagnostics";
import type { WalletView } from "../types";

interface RenameContext {
  wallet: WalletView;
  trimmedName: string;
  previousName: string;
}

function validateRename(walletId: string, newName: string): WalletActionResult<RenameContext> {
  const trimmedName = newName.trim();
  if (!trimmedName) return walletErrorResult(WalletErrorCode.NAME_EMPTY);
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) return walletErrorResult(WalletErrorCode.WALLET_NOT_FOUND);
  return walletSuccess({ wallet, trimmedName, previousName: wallet.name });
}

function applyOptimisticRename(walletId: string, trimmedName: string): void {
  const current = walletViewStore.getWalletViews();
  setWalletViews(current.map((w) => (w.id === walletId ? { ...w, name: trimmedName } : w)));
}

function revertRename(walletId: string, trimmedName: string, previousName: string): void {
  const views = walletViewStore.getWalletViews();
  const currentView = views.find((w) => w.id === walletId);
  if (currentView && currentView.name === trimmedName) {
    setWalletViews(views.map((w) => (w.id === walletId ? { ...w, name: previousName } : w)));
  }
}

export async function renameWalletView(walletId: string, newName: string): Promise<WalletActionResult> {
  const validation = validateRename(walletId, newName);
  if (validation.outcome === "error") return validation;
  const { wallet, trimmedName, previousName } = validation.value;

  applyOptimisticRename(walletId, trimmedName);
  if (!wallet.serverId) return walletSuccess(undefined);

  try {
    const { client, username } = getWalletClient();
    const input = { name: trimmedName, items: [...wallet.originalItems], symbolGroups: [...wallet.originalSymbolGroups] };
    await client.updateWalletView(username, wallet.serverId, input);
    return walletSuccess(undefined);
  } catch (error) {
    revertRename(walletId, trimmedName, previousName);
    Logger.error("Failed to rename wallet view", {
      tag: "wallet",
      error: error instanceof Error ? error : new Error(String(error)),
      data: { walletId, newName: trimmedName },
    });
    return walletErrorResult(WalletErrorCode.RENAME_FAILED);
  }
}
