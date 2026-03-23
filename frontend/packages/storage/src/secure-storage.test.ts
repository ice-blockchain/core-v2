import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ISecureStorage } from "./types";

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function createMockSecureStorage(): ISecureStorage {
  const store = new Map<string, string>();
  const REGISTRY_KEY = "__keys__";

  function getKeys(): string[] {
    const raw = store.get(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }

  function saveKeys(keys: string[]): void {
    store.set(REGISTRY_KEY, JSON.stringify(keys));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },

    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
      const keys = getKeys();
      if (!keys.includes(key)) {
        keys.push(key);
        saveKeys(keys);
      }
    },

    async removeItem(key: string): Promise<void> {
      store.delete(key);
      saveKeys(getKeys().filter((k) => k !== key));
    },

    async hasItem(key: string): Promise<boolean> {
      return store.has(key);
    },

    async clear(): Promise<void> {
      store.clear();
    },
  };
}

vi.stubGlobal("localStorage", createMockLocalStorage());

describe("ISecureStorage contract", () => {
  let storage: ISecureStorage;

  beforeEach(() => {
    storage = createMockSecureStorage();
  });

  it("stores and retrieves a value", async () => {
    await storage.setItem("token", "secret-123");
    expect(await storage.getItem("token")).toBe("secret-123");
  });

  it("returns null for missing keys", async () => {
    expect(await storage.getItem("missing")).toBeNull();
  });

  it("removes a value", async () => {
    await storage.setItem("token", "secret");
    await storage.removeItem("token");
    expect(await storage.getItem("token")).toBeNull();
  });

  it("checks existence with hasItem()", async () => {
    await storage.setItem("key", "value");
    expect(await storage.hasItem("key")).toBe(true);
    expect(await storage.hasItem("missing")).toBe(false);
  });

  it("clears all entries", async () => {
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    await storage.clear();
    expect(await storage.getItem("a")).toBeNull();
    expect(await storage.getItem("b")).toBeNull();
  });

  it("overwrites existing values", async () => {
    await storage.setItem("key", "v1");
    await storage.setItem("key", "v2");
    expect(await storage.getItem("key")).toBe("v2");
  });
});

describe("createSecureStorage (web/crypto)", () => {
  beforeEach(() => {
    (globalThis.localStorage as ReturnType<typeof createMockLocalStorage>)
      .clear();
  });

  it("encrypts and decrypts a value via Web Crypto", async () => {
    const { createSecureStorage } = await import(
      "./platform/secure-storage.web"
    );
    const storage = createSecureStorage("test-password");

    await storage.setItem("nsec", "my-private-key");
    const result = await storage.getItem("nsec");
    expect(result).toBe("my-private-key");

    const raw = localStorage.getItem("@ion/secure/nsec");
    expect(raw).not.toBeNull();
    expect(raw).not.toBe("my-private-key");
  });

  it("returns null for missing keys", async () => {
    const { createSecureStorage } = await import(
      "./platform/secure-storage.web"
    );
    const storage = createSecureStorage("test-password");
    expect(await storage.getItem("missing")).toBeNull();
  });

  it("removes an encrypted value", async () => {
    const { createSecureStorage } = await import(
      "./platform/secure-storage.web"
    );
    const storage = createSecureStorage("pw");

    await storage.setItem("key", "secret");
    await storage.removeItem("key");
    expect(await storage.getItem("key")).toBeNull();
    expect(await storage.hasItem("key")).toBe(false);
  });

  it("clears all encrypted entries and salt", async () => {
    const { createSecureStorage } = await import(
      "./platform/secure-storage.web"
    );
    const storage = createSecureStorage("pw");

    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    await storage.clear();

    expect(await storage.getItem("a")).toBeNull();
    expect(await storage.getItem("b")).toBeNull();
    expect(localStorage.getItem("@ion/secure/__salt__")).toBeNull();
  });
});
