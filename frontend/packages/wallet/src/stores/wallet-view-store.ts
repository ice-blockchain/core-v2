import type { WalletView, WalletViewStore } from "../types";

const listeners = new Set<() => void>();

const DEFAULT_WALLET_VIEW: WalletView = {
  id: "1", name: "ion.wallet", balance: "$0.00", isMain: true, coinGroups: [], isLoading: false, serverId: null, originalItems: [], originalSymbolGroups: [],
};

function createDefaultWalletView(): WalletView {
  return { ...DEFAULT_WALLET_VIEW };
}

let walletViews: readonly WalletView[] = [createDefaultWalletView()];
let activeWalletViewId = "1";
let nextId = 2;

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Mock in-memory store. Will be removed when real wallet client is integrated.
export const walletViewStore: WalletViewStore = {
  getWalletViews: () => walletViews,
  getActiveWalletViewId: () => activeWalletViewId,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Internal mutators used by action modules.
export function getNextId(): string {
  return String(nextId++);
}

export function setWalletViews(next: readonly WalletView[]): void {
  walletViews = next;
  emitChange();
}

export function setActiveWalletViewId(id: string): void {
  if (activeWalletViewId === id) return;
  activeWalletViewId = id;
  emitChange();
}

export function batchUpdate(
  nextViews: readonly WalletView[],
  nextActiveId: string,
): void {
  walletViews = nextViews;
  activeWalletViewId = nextActiveId;
  emitChange();
}

// Reset store to initial state (for testing).
export function resetWalletViewStore(): void {
  walletViews = [createDefaultWalletView()];
  activeWalletViewId = "1";
  nextId = 2;
  emitChange();
}
