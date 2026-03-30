import type { AspectRatioResult, MediaViewerSource } from './types';

export function calculateAspectRatio(
  source: Pick<MediaViewerSource, 'width' | 'height'>,
): AspectRatioResult | null {
  if (!source.width || !source.height || source.height === 0) {
    return null;
  }

  return {
    width: source.width,
    height: source.height,
    aspectRatio: source.width / source.height,
  };
}

export function getAspectRatioStyle(
  source: Pick<MediaViewerSource, 'width' | 'height'>,
): { aspectRatio: number } | undefined {
  const result = calculateAspectRatio(source);
  if (!result) return undefined;
  return { aspectRatio: result.aspectRatio };
}
