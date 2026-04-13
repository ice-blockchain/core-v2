import { describe, it, expect, beforeEach, vi } from "vitest";
import { switchWalletView } from "./switch-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";
import { ActionError } from "@ion/diagnostics";

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

  it("switches the active wallet", () => {
    createWalletView("Second");
    const views = walletViewStore.getWalletViews();
    const secondId = views.find((v) => !v.isMain)!.id;
    switchWalletView("1");
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    switchWalletView(secondId);
    expect(walletViewStore.getActiveWalletViewId()).toBe(secondId);
  });

  it("throws ActionError(WALLET_NOT_FOUND) when wallet is not found", () => {
    try {
      switchWalletView("999");
      expect.fail("expected switchWalletView to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ActionError);
      expect((error as ActionError).code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
    }
  });
});
