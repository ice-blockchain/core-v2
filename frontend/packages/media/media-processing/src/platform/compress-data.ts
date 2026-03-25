import type { CompressDataOptions, CompressedData } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function compressData(
  _input: Uint8Array | string,
  _options?: CompressDataOptions,
): Promise<CompressedData> {
  throw new Error("Platform implementation not resolved");
}
