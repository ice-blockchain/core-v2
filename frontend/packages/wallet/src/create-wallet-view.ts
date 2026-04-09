import type { WalletView } from "./types";
import {
  walletViewStore,
  batchUpdate,
  getNextId,
} from "./wallet-view-store";

export const MAX_WALLET_VIEWS = 2;

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

  batchUpdate([...current, walletView], walletView.id);
  return walletView;
}
