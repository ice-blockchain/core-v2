import {
  walletViewStore,
  setWalletViews,
  batchUpdate,
} from "../stores/wallet-view-store";

export function deleteWalletView(walletId: string): void {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }
  if (wallet.isMain) {
    throw new Error("Cannot delete the main wallet");
  }
  if (current.length <= 1) {
    throw new Error("Cannot delete the last wallet");
  }

  const remaining = current.filter((w) => w.id !== walletId);
  const activeId = walletViewStore.getActiveWalletViewId();

  if (activeId === walletId && remaining[0]) {
    batchUpdate(remaining, remaining[0].id);
  } else {
    setWalletViews(remaining);
  }
}
