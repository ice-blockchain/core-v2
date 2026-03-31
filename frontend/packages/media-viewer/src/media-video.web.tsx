import React, { useCallback, useRef } from 'react';
import type { MediaVideoProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

function buildContainerCss(
  style: MediaVideoProps['style'],
  source: MediaVideoProps['source'],
): React.CSSProperties {
  const aspectStyle = getAspectRatioStyle(source);
  const base: React.CSSProperties = { position: 'relative' };
  if (aspectStyle) base.aspectRatio = aspectStyle.aspectRatio;
  const cssStyle = (style ?? {}) as React.CSSProperties;
  if (!style) return { ...base, width: '100%', height: '100%' };
  return { ...base, ...cssStyle };
}

export function MediaVideo(props: MediaVideoProps) {
  const { source, autoPlay = false, muted = false, isLooping = false, resizeMode = 'contain', style } = props;
  const { onLoad, onEnd, onError } = props;
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoad = useCallback(() => onLoad?.(), [onLoad]);
  const handleEnded = useCallback(() => onEnd?.(), [onEnd]);
  const handleError = useCallback(
    () => onError?.(new Error('Video playback error')),
    [onError],
  );

  return (
    <div style={buildContainerCss(style, source)}>
      <video
        ref={videoRef}
        src={source.uri}
        autoPlay={autoPlay}
        muted={muted}
        loop={isLooping}
        playsInline
        poster={source.thumbnailUri}
        onLoadedData={handleLoad}
        onEnded={handleEnded}
        onError={handleError}
        style={{ width: '100%', height: '100%', objectFit: resizeMode }}
      />
    </div>
  );
}
