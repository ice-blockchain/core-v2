import type { WalletView } from "./types";
import {
  walletViewStore,
  setWalletViews,
  setActiveWalletViewId,
  getNextId,
} from "./wallet-view-store";

const MAX_WALLET_VIEWS = 2;

export function createWalletView(name: string): WalletView {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Wallet name cannot be empty");
  }

  const current = walletViewStore.getWalletViews();
  if (current.length >= MAX_WALLET_VIEWS) {
    throw new Error("Maximum number of wallets reached");
  }

  const walletView: WalletView = {
    id: getNextId(),
    name: trimmedName,
    balance: "$0.00",
    isMain: false,
  };

  setWalletViews([...current, walletView]);
  setActiveWalletViewId(walletView.id);
  return walletView;
}
