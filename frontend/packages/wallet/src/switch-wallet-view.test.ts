import { describe, it, expect, beforeEach } from "vitest";
import { switchWalletView } from "./switch-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, resetWalletViewStore } from "./wallet-view-store";

describe("switchWalletView", () => {
  beforeEach(() => {
    resetWalletViewStore();
  });

  it("switches the active wallet", () => {
    const second = createWalletView("Second");
    switchWalletView("1");
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    switchWalletView(second.id);
    expect(walletViewStore.getActiveWalletViewId()).toBe(second.id);
  });

  it("throws when wallet is not found", () => {
    expect(() => switchWalletView("999")).toThrow("Wallet not found");
  });
});
