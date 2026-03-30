import type { VideoProcessingOptions, ProcessedMedia } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function compressVideo(
  _uri: string,
  _options?: VideoProcessingOptions,
): Promise<ProcessedMedia> {
  throw new Error("Platform implementation not resolved");
}
