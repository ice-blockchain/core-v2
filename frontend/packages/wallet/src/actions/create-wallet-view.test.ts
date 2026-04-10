import { describe, it, expect, beforeEach } from "vitest";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, resetWalletViewStore } from "../stores/wallet-view-store";

describe("createWalletView", () => {
  beforeEach(() => {
    resetWalletViewStore();
  });

  it("creates a new wallet with the given name", () => {
    const wallet = createWalletView("Savings");
    expect(wallet.name).toBe("Savings");
    expect(wallet.balance).toBe("$0.00");
    expect(wallet.isMain).toBe(false);
    expect(walletViewStore.getWalletViews()).toHaveLength(2);
  });

  it("trims the wallet name", () => {
    const wallet = createWalletView("  Savings  ");
    expect(wallet.name).toBe("Savings");
  });

  it("sets the new wallet as active", () => {
    const wallet = createWalletView("Savings");
    expect(walletViewStore.getActiveWalletViewId()).toBe(wallet.id);
  });

  it("throws when name is empty", () => {
    expect(() => createWalletView("")).toThrow("Wallet name cannot be empty");
    expect(() => createWalletView("   ")).toThrow(
      "Wallet name cannot be empty",
    );
  });

  it("throws when maximum wallet limit is reached", () => {
    createWalletView("Second");
    expect(() => createWalletView("Third")).toThrow(
      "Maximum number of wallets reached",
    );
  });
});
