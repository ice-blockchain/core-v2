import { useSyncExternalStore } from "react";
import type { WalletView } from "./types";
import { walletViewStore } from "./wallet-view-store";

export function useWalletViews(): readonly WalletView[] {
  return useSyncExternalStore(
    walletViewStore.subscribe,
    walletViewStore.getWalletViews,
  );
}
