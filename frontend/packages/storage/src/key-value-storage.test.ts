import { describe, it, expect, beforeEach, vi } from "vitest";
import { createKeyValueStorage } from "./platform/key-value-storage.web";

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

vi.stubGlobal("localStorage", createMockLocalStorage());

describe("createKeyValueStorage (web/localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves a string", () => {
    const kv = createKeyValueStorage({ id: "test" });
    kv.setString("name", "alice");
    expect(kv.getString("name")).toBe("alice");
  });

  it("returns null for missing string", () => {
    const kv = createKeyValueStorage({ id: "test" });
    expect(kv.getString("missing")).toBeNull();
  });

  it("stores and retrieves a number", () => {
    const kv = createKeyValueStorage({ id: "test" });
    kv.setNumber("count", 42);
    expect(kv.getNumber("count")).toBe(42);
  });

  it("returns null for missing number", () => {
    const kv = createKeyValueStorage({ id: "test" });
    expect(kv.getNumber("missing")).toBeNull();
  });

  it("stores and retrieves a boolean", () => {
    const kv = createKeyValueStorage({ id: "test" });
    kv.setBoolean("enabled", true);
    expect(kv.getBoolean("enabled")).toBe(true);

    kv.setBoolean("enabled", false);
    expect(kv.getBoolean("enabled")).toBe(false);
  });

  it("returns null for missing boolean", () => {
    const kv = createKeyValueStorage({ id: "test" });
    expect(kv.getBoolean("missing")).toBeNull();
  });

  it("stores and retrieves an object", () => {
    const kv = createKeyValueStorage({ id: "test" });
    const data = { name: "alice", age: 30, tags: ["dev"] };
    kv.setObject("profile", data);
    expect(kv.getObject("profile")).toEqual(data);
  });

  it("returns null for missing object", () => {
    const kv = createKeyValueStorage({ id: "test" });
    expect(kv.getObject("missing")).toBeNull();
  });

  it("removes an item", () => {
    const kv = createKeyValueStorage({ id: "test" });
    kv.setString("key", "value");
    kv.removeItem("key");
    expect(kv.getString("key")).toBeNull();
  });

  it("checks existence with hasItem()", () => {
    const kv = createKeyValueStorage({ id: "test" });
    kv.setString("key", "value");
    expect(kv.hasItem("key")).toBe(true);
    expect(kv.hasItem("missing")).toBe(false);
  });

  it("clears only entries for the given id", () => {
    const kv1 = createKeyValueStorage({ id: "app1" });
    const kv2 = createKeyValueStorage({ id: "app2" });

    kv1.setString("key", "from-app1");
    kv2.setString("key", "from-app2");

    kv1.clear();

    expect(kv1.getString("key")).toBeNull();
    expect(kv2.getString("key")).toBe("from-app2");
  });

  it("isolates keys between different storage ids", () => {
    const kv1 = createKeyValueStorage({ id: "store1" });
    const kv2 = createKeyValueStorage({ id: "store2" });

    kv1.setString("shared", "value1");
    kv2.setString("shared", "value2");

    expect(kv1.getString("shared")).toBe("value1");
    expect(kv2.getString("shared")).toBe("value2");
  });
});
