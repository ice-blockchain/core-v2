import type { ProcessingOptions, ProcessedMedia } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function compressImage(
  _uri: string,
  _options?: ProcessingOptions,
): Promise<ProcessedMedia> {
  throw new Error("Platform implementation not resolved");
}
