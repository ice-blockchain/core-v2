import React, { useCallback } from 'react';
import type { MediaImageProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

function buildContainerCss(
  style: MediaImageProps['style'],
  source: MediaImageProps['source'],
): React.CSSProperties {
  const aspectStyle = getAspectRatioStyle(source);
  const base: React.CSSProperties = {};
  if (aspectStyle) base.aspectRatio = aspectStyle.aspectRatio;
  const cssStyle = (style ?? {}) as React.CSSProperties;
  if (!style) return { ...base, width: '100%', height: '100%' };
  return { ...base, ...cssStyle };
}

export function MediaImage(props: MediaImageProps) {
  const { source, style, resizeMode = 'cover', onLoad, onError } = props;

  const handleError = useCallback(
    () => onError?.(new Error('Image failed to load')),
    [onError],
  );

  return (
    <img
      src={source.uri}
      style={{ ...buildContainerCss(style, source), objectFit: resizeMode }}
      onLoad={onLoad}
      onError={handleError}
      alt=""
    />
  );
}
