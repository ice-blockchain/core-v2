import { describe, it, expect } from "vitest";
import type { WalletViewDetail, WalletViewCoin } from "@ion/identity-client";
import { convertWalletView } from "./convert-wallet-view";

function makeCoin(overrides: Partial<WalletViewCoin> = {}): WalletViewCoin {
  return {
    walletId: "w1",
    id: "coin-1",
    name: "Bitcoin",
    symbol: "BTC",
    symbolGroup: "bitcoin",
    network: "bitcoin",
    contractAddress: "",
    decimals: 8,
    priceUSD: "50000",
    iconURL: "https://example.com/btc.png",
    syncFrequency: 60,
    native: true,
    prioritized: false,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<WalletViewDetail> = {}): WalletViewDetail {
  return {
    id: "view-1",
    name: "Main Wallet",
    coins: [],
    aggregation: {},
    symbolGroups: [],
    createdAt: "",
    updatedAt: "",
    userId: "user-1",
    nfts: null,
    ...overrides,
  };
}

describe("convertWalletView", () => {
  it("groups coins by symbolGroup with correct balances", () => {
    const detail = makeDetail({
      coins: [
        makeCoin({ id: "btc-1", symbol: "BTC", symbolGroup: "bitcoin", network: "bitcoin" }),
        makeCoin({ id: "eth-1", symbol: "ETH", symbolGroup: "ethereum", name: "Ethereum", network: "ethereum", decimals: 18, priceUSD: "3000" }),
      ],
      aggregation: {
        btc: { wallets: [{ asset: { kind: "Native" as const, decimals: 8, balance: "100000000" }, walletId: "w1", network: "bitcoin", coinId: "btc-1" }], totalBalance: "0" },
        eth: { wallets: [{ asset: { kind: "Native" as const, decimals: 18, balance: "1000000000000000000" }, walletId: "w1", network: "ethereum", coinId: "eth-1" }], totalBalance: "0" },
      },
    });

    const result = convertWalletView(detail);
    expect(result.coinGroups).toHaveLength(2);
    expect(result.usdBalance).toBe(53000);
  });

  it("merges same symbolGroup across networks into one group", () => {
    const detail = makeDetail({
      coins: [
        makeCoin({ id: "usdt-eth", symbol: "USDT", symbolGroup: "tether", name: "USDT", network: "ethereum", decimals: 6, priceUSD: "1", contractAddress: "0xdac17" }),
        makeCoin({ id: "usdt-tron", symbol: "USDT", symbolGroup: "tether", name: "USDT", network: "tron", decimals: 6, priceUSD: "1", contractAddress: "TR7NHq" }),
      ],
      aggregation: {
        usdt: {
          wallets: [
            { asset: { kind: "Erc20" as const, decimals: 6, balance: "1000000", contract: "0xdac17" }, walletId: "w1", network: "ethereum", coinId: "usdt-eth" },
            { asset: { kind: "Trc20" as const, decimals: 6, balance: "2000000", contract: "TR7NHq", symbol: "USDT" }, walletId: "w1", network: "tron", coinId: "usdt-tron" },
          ],
          totalBalance: "0",
        },
      },
    });

    const result = convertWalletView(detail);
    expect(result.coinGroups).toHaveLength(1);
    expect(result.coinGroups[0]!.coins).toHaveLength(2);
    expect(result.coinGroups[0]!.totalAmount).toBe(3);
    expect(result.coinGroups[0]!.totalBalanceUSD).toBe(3);
  });

  it("assigns zero balance to coins with no aggregation entry", () => {
    const detail = makeDetail({
      coins: [makeCoin({ id: "new-coin", symbolGroup: "newcoin", symbol: "NEW" })],
      aggregation: {},
    });

    const result = convertWalletView(detail);
    expect(result.coinGroups).toHaveLength(1);
    expect(result.coinGroups[0]!.coins[0]!.amount).toBe(0);
    expect(result.coinGroups[0]!.coins[0]!.balanceUSD).toBe(0);
  });

  it("deduplicates consumed aggregation wallets", () => {
    const sharedWallet = {
      asset: { kind: "Native" as const, decimals: 8, balance: "100000000" },
      walletId: "w1",
      network: "bitcoin",
      coinId: null as string | null,
    };

    const detail = makeDetail({
      coins: [
        makeCoin({ id: "btc-1", walletId: "w1", network: "bitcoin" }),
        makeCoin({ id: "btc-2", walletId: "w1", network: "bitcoin", name: "Bitcoin Wrapped" }),
      ],
      aggregation: {
        btc: { wallets: [sharedWallet], totalBalance: "0" },
      },
    });

    const result = convertWalletView(detail);
    const coins = result.coinGroups[0]!.coins;
    expect(coins[0]!.amount).toBe(1);
    expect(coins[1]!.amount).toBe(0);
    expect(result.usdBalance).toBe(50000);
  });

  it("filters invalid coins and keeps valid ones", () => {
    const detail = makeDetail({
      coins: [
        makeCoin({ id: "", symbol: "BAD" }),
        makeCoin({ id: "good-1", symbol: "GOOD", symbolGroup: "good" }),
      ],
      aggregation: {},
    });

    const result = convertWalletView(detail);
    expect(result.coinGroups).toHaveLength(1);
    expect(result.coinGroups[0]!.abbreviation).toBe("GOOD");
  });

  it("sorts groups with ION first", () => {
    const detail = makeDetail({
      coins: [
        makeCoin({ id: "btc-1", symbolGroup: "bitcoin", symbol: "BTC", priceUSD: "50000" }),
        makeCoin({ id: "ion-1", symbolGroup: "ion", symbol: "ION", name: "ION", priceUSD: "1" }),
      ],
      aggregation: {},
    });

    const result = convertWalletView(detail);
    expect(result.coinGroups[0]!.symbolGroup).toBe("ion");
  });

  it("computes correct total USD balance across groups", () => {
    const detail = makeDetail({
      coins: [
        makeCoin({ id: "btc-1", symbol: "BTC", symbolGroup: "bitcoin", priceUSD: "50000", decimals: 8 }),
        makeCoin({ id: "eth-1", symbol: "ETH", symbolGroup: "ethereum", name: "Ethereum", network: "ethereum", priceUSD: "3000", decimals: 18 }),
      ],
      aggregation: {
        btc: { wallets: [{ asset: { kind: "Native" as const, decimals: 8, balance: "200000000" }, walletId: "w1", network: "bitcoin", coinId: "btc-1" }], totalBalance: "0" },
        eth: { wallets: [{ asset: { kind: "Native" as const, decimals: 18, balance: "2000000000000000000" }, walletId: "w1", network: "ethereum", coinId: "eth-1" }], totalBalance: "0" },
      },
    });

    const result = convertWalletView(detail);
    expect(result.usdBalance).toBe(106000);
  });
});
