import { walletViewStore, setWalletViews } from "./wallet-view-store";

export function renameWalletView(walletId: string, newName: string): void {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error("Wallet name cannot be empty");
  }

  const current = walletViewStore.getWalletViews();
  const wallet = current.find((w) => w.id === walletId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  setWalletViews(
    current.map((w) => (w.id === walletId ? { ...w, name: trimmedName } : w)),
  );
}
