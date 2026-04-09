import { describe, it, expect, beforeEach, vi } from "vitest";
import { walletViewStore, resetWalletViewStore } from "./wallet-view-store";

describe("walletViewStore", () => {
  beforeEach(() => {
    resetWalletViewStore();
  });

  it("returns default wallet on initialization", () => {
    const wallets = walletViewStore.getWalletViews();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toEqual({
      id: "1",
      name: "ion.wallet",
      balance: "$0.00",
      isMain: true,
    });
  });

  it("returns default active wallet id", () => {
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
  });

  it("notifies subscribers on reset", () => {
    const listener = vi.fn();
    walletViewStore.subscribe(listener);
    resetWalletViewStore();
    expect(listener).toHaveBeenCalled();
  });

  it("unsubscribes when returned function is called", () => {
    const listener = vi.fn();
    const unsubscribe = walletViewStore.subscribe(listener);
    unsubscribe();
    resetWalletViewStore();
    expect(listener).not.toHaveBeenCalled();
  });
});
