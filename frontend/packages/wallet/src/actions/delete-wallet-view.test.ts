import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteWalletView } from "./delete-wallet-view";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";

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

  it("deletes a non-main wallet", async () => {
    await createWalletView("Second");
    const secondId = getSecondWalletId();
    await deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
  });

  it("switches active to remaining wallet when active is deleted", async () => {
    await createWalletView("Second");
    const secondId = getSecondWalletId();
    expect(walletViewStore.getActiveWalletViewId()).toBe(secondId);
    await deleteWalletView(secondId);
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
  });

  it("returns CANNOT_DELETE_MAIN when trying to delete the main wallet", async () => {
    await createWalletView("Second");
    const result = await deleteWalletView("1");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.CANNOT_DELETE_MAIN);
  });

  it("returns CANNOT_DELETE_MAIN after other wallets are removed", async () => {
    await createWalletView("Second");
    const secondId = getSecondWalletId();
    await deleteWalletView(secondId);
    const result = await deleteWalletView("1");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.CANNOT_DELETE_MAIN);
  });

  it("returns WALLET_NOT_FOUND when wallet is not found", async () => {
    const result = await deleteWalletView("999");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
  });

  it("reverts on API failure", async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error("API error"));
    resetWalletClient();
    initializeWalletClient({
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
      deleteWalletView: deleteFn,
    } as never, "alice");

    await createWalletView("Second");
    const secondId = getSecondWalletId();
    const views = walletViewStore.getWalletViews();
    setWalletViews(views.map((v) => (v.id === secondId ? { ...v, serverId: "srv-2" } : v)));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const promise = deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    const result = await promise;
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.DELETE_FAILED);
    expect(walletViewStore.getWalletViews()).toHaveLength(2);
    consoleSpy.mockRestore();
  });

  it("skips API call when serverId is null", async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    resetWalletClient();
    initializeWalletClient({
      createWalletView: vi.fn().mockResolvedValue(mockDetail),
      getWalletView: vi.fn().mockResolvedValue(mockDetail),
      deleteWalletView: deleteFn,
    } as never, "alice");

    await createWalletView("Second");
    const secondId = getSecondWalletId();
    const views = walletViewStore.getWalletViews();
    setWalletViews(views.map((v) => (v.id === secondId ? { ...v, serverId: null } : v)));

    await deleteWalletView(secondId);
    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
