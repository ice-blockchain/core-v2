import React from 'react';
import { Image } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';
import type { MediaImageProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

const RESIZE_MODE_MAP = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
} as const;

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

  return (
    <Image
      source={{ uri: source.uri }}
      style={buildImageStyle(style, source)}
      resizeMode={RESIZE_MODE_MAP[resizeMode]}
      onLoad={onLoad}
      onError={() => onError?.(new Error('Image failed to load'))}
    />
  );
}
