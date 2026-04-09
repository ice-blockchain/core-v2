import { useSyncExternalStore } from "react";
import type { WalletView } from "./types";
import { walletViewStore } from "./wallet-view-store";

export function useActiveWalletView(): WalletView {
  const walletViews = useSyncExternalStore(
    walletViewStore.subscribe,
    walletViewStore.getWalletViews,
  );

  const activeId = useSyncExternalStore(
    walletViewStore.subscribe,
    walletViewStore.getActiveWalletViewId,
  );

  const active = walletViews.find((w) => w.id === activeId);
  if (!active) {
    throw new Error("Active wallet not found");
  }

  return active;
}
