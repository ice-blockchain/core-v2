import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteWalletView } from "./delete-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";

function getSecondWalletId(): string {
  const views = walletViewStore.getWalletViews();
  const second = views.find((v) => !v.isMain);
  if (!second) throw new Error("Second wallet not found");
  return second.id;
}

describe("deleteWalletView", () => {
  beforeEach(() => {
    resetWalletClient();
    const mockClient = {
      createWalletView: vi.fn().mockResolvedValue({
        id: "server-id-1", name: "Second", coins: [], aggregation: {},
        symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
      }),
    } as never;
    initializeWalletClient(mockClient, "alice");
  });

  it("deletes a non-main wallet", () => {
    createWalletView("Second");
    const secondId = getSecondWalletId();
    deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
  });

  it("switches active to remaining wallet when active is deleted", () => {
    createWalletView("Second");
    const secondId = getSecondWalletId();
    expect(walletViewStore.getActiveWalletViewId()).toBe(secondId);
    deleteWalletView(secondId);
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
  });

  it("throws when trying to delete the main wallet", () => {
    createWalletView("Second");
    expect(() => deleteWalletView("1")).toThrow(
      "Cannot delete the main wallet",
    );
  });

  it("throws when trying to delete the last wallet", () => {
    createWalletView("Second");
    const secondId = getSecondWalletId();
    deleteWalletView(secondId);
    const store = walletViewStore.getWalletViews();
    expect(store).toHaveLength(1);
    expect(() => deleteWalletView("1")).toThrow("Cannot delete the main wallet");
  });

  it("throws when wallet is not found", () => {
    expect(() => deleteWalletView("999")).toThrow("Wallet not found");
  });
});
