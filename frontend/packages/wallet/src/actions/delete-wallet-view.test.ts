import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteWalletView } from "./delete-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getSecondWalletId(): string {
  const views = walletViewStore.getWalletViews();
  const second = views.find((v) => !v.isMain);
  if (!second) throw new Error("Second wallet not found");
  return second.id;
}

describe("deleteWalletView", () => {
  const mockDetail = {
    id: "server-id-1", name: "Second", coins: [], aggregation: {},
    symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
  };

  beforeEach(() => {
    resetWalletClient();
    const mockClient = {
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
      deleteWalletView: vi.fn().mockResolvedValue(undefined),
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

  it("reverts on API failure", async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error("API error"));
    resetWalletClient();
    initializeWalletClient({
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
      deleteWalletView: deleteFn,
    } as never, "alice");

    createWalletView("Second");
    const secondId = getSecondWalletId();
    const views = walletViewStore.getWalletViews();
    setWalletViews(views.map((v) => (v.id === secondId ? { ...v, serverId: "srv-2" } : v)));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    await flushPromises();
    expect(walletViewStore.getWalletViews()).toHaveLength(2);
    consoleSpy.mockRestore();
  });

  it("skips API call when serverId is null", () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    resetWalletClient();
    initializeWalletClient({
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
      deleteWalletView: deleteFn,
    } as never, "alice");

    createWalletView("Second");
    const secondId = getSecondWalletId();
    deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
