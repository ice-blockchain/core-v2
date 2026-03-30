import { preprocessImagePlatform } from './platform/preprocess-image';
import type { PreprocessedImage } from './types';

export async function preprocessImage(
  uri: string,
): Promise<PreprocessedImage> {
  return preprocessImagePlatform(uri);
}
