import { describe, it, expect, beforeEach, vi } from "vitest";
import { switchWalletView } from "./switch-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";

describe("switchWalletView", () => {
  const mockDetail = {
    id: "server-id-1", name: "Second", coins: [], aggregation: {},
    symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
  };

  beforeEach(() => {
    resetWalletClient();
    const mockClient = {
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
    } as never;
    initializeWalletClient(mockClient, "alice");
  });

  it("switches the active wallet", async () => {
    await createWalletView("Second");
    const views = walletViewStore.getWalletViews();
    const secondId = views.find((v) => !v.isMain)!.id;
    expect(switchWalletView("1").outcome).toBe("success");
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    expect(switchWalletView(secondId).outcome).toBe("success");
    expect(walletViewStore.getActiveWalletViewId()).toBe(secondId);
  });

  it("returns WALLET_NOT_FOUND error when wallet is not found", () => {
    const result = switchWalletView("999");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") {
      expect(result.error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    }
  });
});
