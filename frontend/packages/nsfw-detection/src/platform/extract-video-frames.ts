import type { ExtractedFrame, VideoSafetyOptions } from '../types';

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function extractVideoFramesPlatform(
  _uri: string,
  _options?: VideoSafetyOptions,
): Promise<ExtractedFrame[]> {
  throw new Error('Platform implementation not resolved');
}
