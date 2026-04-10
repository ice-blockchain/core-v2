import { describe, it, expect, beforeEach, vi } from "vitest";
import { switchWalletView } from "./switch-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";

describe("switchWalletView", () => {
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

  it("switches the active wallet", () => {
    createWalletView("Second");
    const views = walletViewStore.getWalletViews();
    const secondId = views.find((v) => !v.isMain)!.id;
    switchWalletView("1");
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    switchWalletView(secondId);
    expect(walletViewStore.getActiveWalletViewId()).toBe(secondId);
  });

  it("throws when wallet is not found", () => {
    expect(() => switchWalletView("999")).toThrow("Wallet not found");
  });
});
