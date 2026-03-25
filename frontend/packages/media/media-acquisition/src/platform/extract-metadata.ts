import type { MediaMetadata } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function extractMetadata(_uri: string): Promise<MediaMetadata> {
  throw new Error("Platform implementation not resolved");
}
