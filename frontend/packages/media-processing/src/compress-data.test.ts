import { describe, it, expect } from "vitest";
import { compressData } from "./platform/compress-data.web";
import brotliPromise from "brotli-wasm";

describe("compressData (web)", () => {
  it("compresses a string input smaller than original", async () => {
    const input = "hello world ".repeat(100);
    const result = await compressData(input);
    expect(result.algorithm).toBe("brotli");
    expect(result.originalSize).toBe(new TextEncoder().encode(input).length);
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.data).toBeInstanceOf(Uint8Array);
  });

  it("compresses a Uint8Array input", async () => {
    const input = new Uint8Array(2000).fill(42);
    const result = await compressData(input);
    expect(result.algorithm).toBe("brotli");
    expect(result.originalSize).toBe(2000);
    expect(result.compressedSize).toBeLessThan(2000);
  });

  it("round-trips: decompress yields original data", async () => {
    const brotli = await brotliPromise;
    const input = "round trip test data ".repeat(50);
    const result = await compressData(input);
    const decompressed = brotli.decompress(result.data);
    const decoded = new TextDecoder().decode(decompressed);
    expect(decoded).toBe(input);
  });

  it("reports accurate originalSize", async () => {
    const input = "hello world";
    const result = await compressData(input);
    expect(result.originalSize).toBe(
      new TextEncoder().encode(input).length,
    );
  });
});
