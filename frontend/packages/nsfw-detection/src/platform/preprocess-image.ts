import type { PreprocessedImage } from '../types';

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function preprocessImagePlatform(
  _uri: string,
): Promise<PreprocessedImage> {
  throw new Error('Platform implementation not resolved');
}
