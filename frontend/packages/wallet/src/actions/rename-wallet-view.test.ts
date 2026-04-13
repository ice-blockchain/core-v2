import { describe, it, expect, beforeEach, vi } from "vitest";
import { renameWalletView } from "./rename-wallet-view";
import { walletViewStore, resetWalletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";

describe("renameWalletView", () => {
  beforeEach(() => {
    resetWalletClient();
    resetWalletViewStore();
    const mockClient = {
      updateWalletView: vi.fn().mockResolvedValue({}),
    } as never;
    initializeWalletClient(mockClient, "alice");
  });

  it("renames optimistically", () => {
    void renameWalletView("1", "My Wallet");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("My Wallet");
  });

  it("reverts name on API failure", async () => {
    resetWalletClient();
    const mockClient = {
      updateWalletView: vi.fn().mockRejectedValue(new Error("API error")),
    } as never;
    initializeWalletClient(mockClient, "alice");
    const views = walletViewStore.getWalletViews();
    setWalletViews(views.map((v) => ({ ...v, serverId: "server-1" })));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const promise = renameWalletView("1", "New Name");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("New Name");
    const result = await promise;
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.RENAME_FAILED);
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("ion.wallet");
    consoleSpy.mockRestore();
  });

  it("skips API call when serverId is null", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    resetWalletClient();
    initializeWalletClient({ updateWalletView: updateFn } as never, "alice");
    await renameWalletView("1", "Local Only");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("Local Only");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns NAME_EMPTY when name is empty", async () => {
    const result = await renameWalletView("1", "");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.NAME_EMPTY);
  });

  it("returns WALLET_NOT_FOUND when wallet is not found", async () => {
    const result = await renameWalletView("999", "New Name");
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.WALLET_NOT_FOUND);
  });
});
