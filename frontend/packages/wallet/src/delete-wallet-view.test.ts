import { describe, it, expect, beforeEach } from "vitest";
import { deleteWalletView } from "./delete-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, resetWalletViewStore } from "./wallet-view-store";

describe("deleteWalletView", () => {
  beforeEach(() => {
    resetWalletViewStore();
  });

  it("deletes a non-main wallet", () => {
    const second = createWalletView("Second");
    deleteWalletView(second.id);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
  });

  it("switches active to remaining wallet when active is deleted", () => {
    const second = createWalletView("Second");
    // second is now active (createWalletView sets it)
    expect(walletViewStore.getActiveWalletViewId()).toBe(second.id);
    deleteWalletView(second.id);
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
  });

  it("throws when trying to delete the main wallet", () => {
    createWalletView("Second");
    expect(() => deleteWalletView("1")).toThrow(
      "Cannot delete the main wallet",
    );
  });

  it("throws when trying to delete the last wallet", () => {
    // Only one wallet exists (the main one), but it's also protected by isMain
    expect(() => deleteWalletView("1")).toThrow(
      "Cannot delete the main wallet",
    );
  });

  it("throws when wallet is not found", () => {
    expect(() => deleteWalletView("999")).toThrow("Wallet not found");
  });
});
