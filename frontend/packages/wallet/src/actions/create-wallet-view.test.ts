import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWalletView } from "./create-wallet-view";
import { walletViewStore, resetWalletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";

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
    void createWalletView("Savings");
    const views = walletViewStore.getWalletViews();
    expect(views).toHaveLength(2);
    expect(views[1]?.name).toBe("Savings");
    expect(views[1]?.isLoading).toBe(true);
    expect(views[1]?.serverId).toBeNull();
  });

  it("updates with server ID after API success", async () => {
    const result = await createWalletView("Savings");
    expect(result.outcome).toBe("success");
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

    const result = await createWalletView("Savings");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.CREATE_FAILED);

    expect(walletViewStore.getWalletViews()).toHaveLength(1);
    expect(walletViewStore.getActiveWalletViewId()).toBe("1");
    consoleSpy.mockRestore();
  });

  it("returns NAME_EMPTY error when name is empty", async () => {
    const result = await createWalletView("");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.NAME_EMPTY);
  });

  it("returns MAX_WALLETS_REACHED when maximum wallet limit is reached", async () => {
    await createWalletView("Second");
    const result = await createWalletView("Third");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.MAX_WALLETS_REACHED);
  });
});
