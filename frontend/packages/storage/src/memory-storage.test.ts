import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMemoryStorage } from "./memory-storage";

describe("createMemoryStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("key", { name: "test" });
    expect(cache.get("key")).toEqual({ name: "test" });
  });

  it("returns null for missing keys", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    expect(cache.get("missing")).toBeNull();
  });

  it("removes a value", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("key", "value");
    cache.remove("key");
    expect(cache.get("key")).toBeNull();
  });

  it("checks existence with has()", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("key", "value");
    expect(cache.has("key")).toBe(true);
    expect(cache.has("missing")).toBe(false);
  });

  it("clears all entries", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get("a")).toBeNull();
  });

  it("reports correct size", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
  });

  it("overwrites existing key without increasing size", () => {
    const cache = createMemoryStorage({ maxSize: 10 });
    cache.set("key", "v1");
    cache.set("key", "v2");
    expect(cache.get("key")).toBe("v2");
    expect(cache.size()).toBe(1);
  });

  describe("TTL expiration", () => {
    it("returns null after TTL expires", () => {
      const cache = createMemoryStorage({ maxSize: 10 });
      cache.set("key", "value", { timeToLiveMs: 1000 });

      vi.advanceTimersByTime(999);
      expect(cache.get("key")).toBe("value");

      vi.advanceTimersByTime(1);
      expect(cache.get("key")).toBeNull();
    });

    it("has() returns false after TTL expires", () => {
      const cache = createMemoryStorage({ maxSize: 10 });
      cache.set("key", "value", { timeToLiveMs: 500 });

      vi.advanceTimersByTime(500);
      expect(cache.has("key")).toBe(false);
    });

    it("size() excludes expired entries", () => {
      const cache = createMemoryStorage({ maxSize: 10 });
      cache.set("short", "v", { timeToLiveMs: 100 });
      cache.set("long", "v", { timeToLiveMs: 5000 });

      vi.advanceTimersByTime(100);
      expect(cache.size()).toBe(1);
    });

    it("keeps entries without TTL indefinitely", () => {
      const cache = createMemoryStorage({ maxSize: 10 });
      cache.set("permanent", "value");

      vi.advanceTimersByTime(999_999);
      expect(cache.get("permanent")).toBe("value");
    });
  });

  describe("LRU eviction", () => {
    it("evicts least recently used when full", () => {
      const cache = createMemoryStorage({ maxSize: 3 });
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      vi.advanceTimersByTime(1);
      cache.set("d", 4);

      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBe(2);
      expect(cache.get("d")).toBe(4);
    });

    it("accessing a key refreshes its LRU position", () => {
      const cache = createMemoryStorage({ maxSize: 3 });
      cache.set("a", 1);
      vi.advanceTimersByTime(1);
      cache.set("b", 2);
      vi.advanceTimersByTime(1);
      cache.set("c", 3);

      vi.advanceTimersByTime(1);
      cache.get("a");

      vi.advanceTimersByTime(1);
      cache.set("d", 4);

      expect(cache.get("a")).toBe(1);
      expect(cache.get("b")).toBeNull();
    });

    it("evicts expired entries before LRU eviction", () => {
      const cache = createMemoryStorage({ maxSize: 3 });
      cache.set("expiring", "v", { timeToLiveMs: 100 });
      cache.set("b", 2);
      cache.set("c", 3);

      vi.advanceTimersByTime(100);
      cache.set("d", 4);

      expect(cache.has("expiring")).toBe(false);
      expect(cache.get("b")).toBe(2);
      expect(cache.get("c")).toBe(3);
      expect(cache.get("d")).toBe(4);
    });
  });

  describe("priority-based eviction", () => {
    it("evicts low priority before normal priority", () => {
      const cache = createMemoryStorage({ maxSize: 3 });
      cache.set("normal", "v", { priority: "normal" });
      vi.advanceTimersByTime(1);
      cache.set("low", "v", { priority: "low" });
      vi.advanceTimersByTime(1);
      cache.set("high", "v", { priority: "high" });

      vi.advanceTimersByTime(1);
      cache.set("new", "v");

      expect(cache.has("low")).toBe(false);
      expect(cache.has("normal")).toBe(true);
      expect(cache.has("high")).toBe(true);
    });

    it("evicts LRU within same priority level", () => {
      const cache = createMemoryStorage({ maxSize: 3 });
      cache.set("a", 1, { priority: "normal" });
      vi.advanceTimersByTime(1);
      cache.set("b", 2, { priority: "normal" });
      vi.advanceTimersByTime(1);
      cache.set("c", 3, { priority: "normal" });

      vi.advanceTimersByTime(1);
      cache.set("d", 4, { priority: "normal" });

      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBe(2);
    });
  });
});
