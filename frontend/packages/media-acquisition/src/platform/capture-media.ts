import type { MediaPickerOptions, CapturedMedia } from "../types";

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function captureMedia(
  _options?: MediaPickerOptions,
): Promise<CapturedMedia> {
  throw new Error("Platform implementation not resolved");
}
