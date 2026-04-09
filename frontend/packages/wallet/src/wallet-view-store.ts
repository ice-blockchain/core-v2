import type { WalletView, WalletViewStore } from "./types";

const listeners = new Set<() => void>();

let walletViews: readonly WalletView[] = [
  { id: "1", name: "ion.wallet", balance: "$0.00", isMain: true },
];

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
  walletViews = [
    { id: "1", name: "ion.wallet", balance: "$0.00", isMain: true },
  ];
  activeWalletViewId = "1";
  nextId = 2;
  emitChange();
}
