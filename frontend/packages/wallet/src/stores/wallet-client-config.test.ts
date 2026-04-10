import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeWalletClient,
  getWalletClient,
  resetWalletClient,
} from "./wallet-client-config";

describe("walletClientConfig", () => {
  beforeEach(() => {
    resetWalletClient();
  });

  it("throws when accessed before initialization", () => {
    expect(() => getWalletClient()).toThrow("Wallet client not initialized");
  });

  it("returns client and username after initialization", () => {
    const mockClient = { listWalletViews: () => {} } as never;
    initializeWalletClient(mockClient, "alice");
    const { client, username } = getWalletClient();
    expect(client).toBe(mockClient);
    expect(username).toBe("alice");
  });

  it("clears client on reset", () => {
    const mockClient = { listWalletViews: () => {} } as never;
    initializeWalletClient(mockClient, "alice");
    resetWalletClient();
    expect(() => getWalletClient()).toThrow("Wallet client not initialized");
  });
});
