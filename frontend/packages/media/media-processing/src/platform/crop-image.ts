import type { CropRegion, ProcessedMedia } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function cropImage(
  _uri: string,
  _region: CropRegion,
): Promise<ProcessedMedia> {
  throw new Error("Platform implementation not resolved");
}
