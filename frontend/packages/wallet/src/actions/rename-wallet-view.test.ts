import { describe, it, expect, beforeEach, vi } from "vitest";
import { renameWalletView } from "./rename-wallet-view";
import { walletViewStore, resetWalletViewStore, setWalletViews } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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
    renameWalletView("1", "My Wallet");
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
    renameWalletView("1", "New Name");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("New Name");
    await flushPromises();
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("ion.wallet");
    consoleSpy.mockRestore();
  });

  it("skips API call when serverId is null", () => {
    const updateFn = vi.fn().mockResolvedValue({});
    resetWalletClient();
    initializeWalletClient({ updateWalletView: updateFn } as never, "alice");
    renameWalletView("1", "Local Only");
    expect(walletViewStore.getWalletViews()[0]?.name).toBe("Local Only");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("throws when name is empty", () => {
    expect(() => renameWalletView("1", "")).toThrow("Wallet name cannot be empty");
  });

  it("throws when wallet is not found", () => {
    expect(() => renameWalletView("999", "New Name")).toThrow("Wallet not found");
  });
});
