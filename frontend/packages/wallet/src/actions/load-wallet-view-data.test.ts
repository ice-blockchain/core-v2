import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IdentityClient } from "@ion/identity-client";
import { loadWalletViewData } from "./load-wallet-view-data";
import { walletViewStore, resetWalletViewStore } from "../stores/wallet-view-store";

function createMockIdentityClient(overrides: Partial<IdentityClient> = {}): IdentityClient {
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
    resetWalletViewStore();
  });

  it("sets isLoading false when no wallet views exist", async () => {
    const client = createMockIdentityClient();
    await loadWalletViewData(client, "alice");

    const active = walletViewStore.getWalletViews().find(
      (w) => w.id === walletViewStore.getActiveWalletViewId(),
    );
    expect(active?.isLoading).toBe(false);
    expect(client.getWalletView).not.toHaveBeenCalled();
  });

  it("loads wallet view data and updates store", async () => {
    const client = createMockIdentityClient({
      listWalletViews: vi.fn().mockResolvedValue([{ id: "v1", name: "Main" }]),
      getWalletView: vi.fn().mockResolvedValue({
        id: "v1", name: "Main",
        coins: [{
          walletId: "w1", id: "btc-1", name: "Bitcoin", symbol: "BTC", symbolGroup: "bitcoin",
          network: "bitcoin", contractAddress: "", decimals: 8, priceUSD: "50000",
          iconURL: "", syncFrequency: 60, native: true, prioritized: false,
        }],
        aggregation: {
          btc: {
            wallets: [{ asset: { kind: "Native", decimals: 8, balance: "100000000" }, walletId: "w1", network: "bitcoin", coinId: "btc-1" }],
            totalBalance: "0",
          },
        },
        symbolGroups: ["bitcoin"], createdAt: "", updatedAt: "", userId: "u1", nfts: null, nextPageToken: null,
      }),
    });

    await loadWalletViewData(client, "alice");

    const active = walletViewStore.getWalletViews().find(
      (w) => w.id === walletViewStore.getActiveWalletViewId(),
    );
    expect(active?.isLoading).toBe(false);
    expect(active?.coinGroups).toHaveLength(1);
    expect(active?.balance).toBe("$50,000.00");
  });

  it("handles API errors without corrupting store", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createMockIdentityClient({
      listWalletViews: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    await loadWalletViewData(client, "alice");

    const active = walletViewStore.getWalletViews().find(
      (w) => w.id === walletViewStore.getActiveWalletViewId(),
    );
    expect(active?.isLoading).toBe(false);
    expect(active?.coinGroups).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
