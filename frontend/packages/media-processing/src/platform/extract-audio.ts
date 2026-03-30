import type { AudioProcessingOptions, ProcessedMedia } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function extractAudio(
  _uri: string,
  _options?: AudioProcessingOptions,
): Promise<ProcessedMedia> {
  throw new Error("Platform implementation not resolved");
}
