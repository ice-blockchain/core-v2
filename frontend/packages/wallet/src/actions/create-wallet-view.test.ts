import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, resetWalletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createWalletView", () => {
  const mockDetail = {
    id: "server-id-1", name: "Savings", coins: [], aggregation: {},
    symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
  };

  beforeEach(() => {
    resetWalletClient();
    resetWalletViewStore();
    const mockClient = {
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
    } as never;
    initializeWalletClient(mockClient, "alice");
  });

  it("adds wallet optimistically with loading state", () => {
    createWalletView("Savings");
    const views = walletViewStore.getWalletViews();
    expect(views).toHaveLength(2);
    expect(views[1]?.name).toBe("Savings");
    expect(views[1]?.isLoading).toBe(true);
    expect(views[1]?.serverId).toBeNull();
  });

  it("updates with server ID after API success", async () => {
    createWalletView("Savings");
    await flushPromises();
    const views = walletViewStore.getWalletViews();
    expect(views[1]?.serverId).toBe("server-id-1");
    expect(views[1]?.isLoading).toBe(false);
  });

  it("reverts on API failure", async () => {
    resetWalletClient();
    const mockClient = {
      createWalletView: vi.fn().mockRejectedValue(new Error("API error")),
      getWalletView: vi.fn(),
    } as never;
    initializeWalletClient(mockClient, "alice");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    createWalletView("Savings");
    await flushPromises();

    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    consoleSpy.mockRestore();
  });

  it("throws when name is empty", () => {
    expect(() => createWalletView("")).toThrow("Wallet name cannot be empty");
  });

  it("throws when maximum wallet limit is reached", () => {
    createWalletView("Second");
    expect(() => createWalletView("Third")).toThrow("Maximum number of wallets reached");
  });
});
