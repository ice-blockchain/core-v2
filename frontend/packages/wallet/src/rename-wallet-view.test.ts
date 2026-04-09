import { describe, it, expect, beforeEach } from "vitest";
import { renameWalletView } from "./rename-wallet-view";
import { walletViewStore, resetWalletViewStore } from "./wallet-view-store";

describe("renameWalletView", () => {
  beforeEach(() => {
    resetWalletViewStore();
  });

  it("renames an existing wallet", () => {
    renameWalletView("1", "My Wallet");
    const wallets = walletViewStore.getWalletViews();
    expect(wallets[0]?.name).toBe("My Wallet");
  });

  it("trims the new name", () => {
    renameWalletView("1", "  Trimmed  ");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("Trimmed");
  });

  it("throws when name is empty", () => {
    expect(() => renameWalletView("1", "")).toThrow(
      "Wallet name cannot be empty",
    );
    expect(() => renameWalletView("1", "   ")).toThrow(
      "Wallet name cannot be empty",
    );
  });

  it("throws when wallet is not found", () => {
    expect(() => renameWalletView("999", "New Name")).toThrow(
      "Wallet not found",
    );
  });
});
