import { extractVideoFramesPlatform } from './platform/extract-video-frames';
import type { ExtractedFrame, VideoSafetyOptions } from './types';

export async function extractVideoFrames(
  uri: string,
  options?: VideoSafetyOptions,
): Promise<ExtractedFrame[]> {
  return extractVideoFramesPlatform(uri, options);
}
