import React from 'react';
import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';
import type { MediaImageProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

const RESIZE_MODE_MAP = {
  cover: 'cover',
  contain: 'contain',
  fill: 'fill',
} as const;

const TRANSITION_DURATION = 200;

function buildPlaceholder(blurhash: string | undefined) {
  if (!blurhash) return null;
  return { blurhash };
}

function buildImageStyle(
  style: ImageStyle | undefined,
  source: MediaImageProps['source'],
): StyleProp<ImageStyle> {
  const aspectStyle = getAspectRatioStyle(source);
  if (!aspectStyle && !style) return { width: '100%', height: '100%' };
  return [aspectStyle && { width: '100%', aspectRatio: aspectStyle.aspectRatio }, style];
}

export function MediaImage(props: MediaImageProps) {
  const { source, style, resizeMode = 'cover', onLoad, onError } = props;
  const optionalProps = buildOptionalProps(onLoad, onError);

  return (
    <Image
      source={{ uri: source.uri }}
      style={buildImageStyle(style, source)}
      contentFit={RESIZE_MODE_MAP[resizeMode]}
      placeholder={buildPlaceholder(source.blurhash)}
      transition={{ duration: TRANSITION_DURATION }}
      cachePolicy="memory-disk"
      {...optionalProps}
    />
  );
}

function buildOptionalProps(
  onLoad: (() => void) | undefined,
  onError: ((error: Error) => void) | undefined,
) {
  const result: Record<string, unknown> = {};
  if (onLoad) result.onLoad = onLoad;
  if (onError) result.onError = () => onError(new Error('Image failed to load'));
  return result;
}
