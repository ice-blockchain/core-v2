import brotliPromise from "brotli-wasm";
import type { CompressDataOptions, CompressedData } from "../types";
import { clampQuality } from "./validate-options";

const DEFAULT_QUALITY = 6;

export async function compressData(
  input: Uint8Array | string,
  options?: CompressDataOptions,
): Promise<CompressedData> {
  const brotli = await brotliPromise;
  const bytes = toBytes(input);
  const compressed = brotli.compress(bytes, {
    quality: clampQuality(options?.quality ?? DEFAULT_QUALITY, 0, 11),
  });
  return {
    data: compressed,
    originalSize: bytes.byteLength,
    compressedSize: compressed.byteLength,
    algorithm: "brotli",
  };
}

function toBytes(input: Uint8Array | string): Uint8Array {
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  return input;
}
