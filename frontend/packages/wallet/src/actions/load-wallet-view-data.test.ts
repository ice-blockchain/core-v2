import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IdentityClient } from "@ion/identity-client";
import { loadWalletViewData } from "./load-wallet-view-data";


import { walletViewStore, resetWalletViewStore } from "../stores/wallet-view-store";
import { initializeWalletClient, resetWalletClient } from "../stores/wallet-client-config";
import { WalletErrorCode } from "../errors";

function createMockClient(overrides: Partial<IdentityClient> = {}): IdentityClient {
  return {
    listWalletViews: vi.fn().mockResolvedValue([]),
    getWalletView: vi.fn().mockResolvedValue({
      id: "v1", name: "Main", coins: [], aggregation: {},
      symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
    }),
    ...overrides,
  } as unknown as IdentityClient;
}

describe("loadWalletViewData", () => {
  beforeEach(() => {
    resetWalletClient();
    resetWalletViewStore();
  });

  it("sets loading false when no wallet views exist", async () => {
    const client = createMockClient();
    initializeWalletClient(client, "alice");
    const result = await loadWalletViewData();
    expect(result.outcome).toBe("success");
    const active = walletViewStore.getWalletViews()[0];
    expect(active?.isLoading).toBe(false);
  });

  it("loads all wallet views in parallel", async () => {
    const getWalletView = vi.fn()
      .mockResolvedValueOnce({
        id: "v1", name: "Main", coins: [{ walletId: "w1", id: "btc-1", name: "Bitcoin", symbol: "BTC", symbolGroup: "bitcoin", network: "bitcoin", contractAddress: "", decimals: 8, priceUSD: "50000", iconURL: "", syncFrequency: 60, native: true, prioritized: false }],
        aggregation: { btc: { wallets: [{ asset: { kind: "Native", decimals: 8, balance: "100000000" }, walletId: "w1", network: "bitcoin", coinId: "btc-1" }], totalBalance: "0" } },
        symbolGroups: ["bitcoin"], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
      })
      .mockResolvedValueOnce({
        id: "v2", name: "Savings", coins: [], aggregation: {},
        symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
      });

    const client = createMockClient({
      listWalletViews: vi.fn().mockResolvedValue([
        { id: "v1", name: "Main", coins: [{ coinId: "btc-1", walletId: "w1" }], symbolGroups: ["bitcoin"], createdAt: "", updatedAt: "", userId: "u1" },
        { id: "v2", name: "Savings", coins: [], symbolGroups: [], createdAt: "", updatedAt: "", userId: "u1" },
      ]),
      getWalletView,
    });
    initializeWalletClient(client, "alice");
    await loadWalletViewData();

    const views = walletViewStore.getWalletViews();
    expect(views).toHaveLength(2);
    expect(views[0]?.isMain).toBe(true);
    expect(views[0]?.serverId).toBe("v1");
    expect(views[1]?.isMain).toBe(false);
    expect(views[1]?.serverId).toBe("v2");
    expect(getWalletView).toHaveBeenCalledTimes(2);
  });

  it("handles API errors without corrupting store", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createMockClient({
      listWalletViews: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    initializeWalletClient(client, "alice");
    const result = await loadWalletViewData();
    expect(result.outcome).toBe("error");
    if (result.outcome === "error") expect(result.error.code).toBe(WalletErrorCode.LOAD_FAILED);
    const views = walletViewStore.getWalletViews();
    expect(views[0]?.isLoading).toBe(false);
    consoleSpy.mockRestore();
  });
});
