import {
  walletViewStore,
  setWalletViews,
  setActiveWalletViewId,
} from "./wallet-view-store";

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
  setWalletViews(remaining);

  if (walletViewStore.getActiveWalletViewId() === walletId && remaining[0]) {
    setActiveWalletViewId(remaining[0].id);
  }
}
