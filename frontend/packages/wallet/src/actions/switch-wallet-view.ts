import { walletViewStore, setActiveWalletViewId } from "../stores/wallet-view-store";

export function switchWalletView(walletId: string): void {
  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  setActiveWalletViewId(walletId);
}
