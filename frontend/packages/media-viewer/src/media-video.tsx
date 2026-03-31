import React, { useCallback, useRef } from 'react';
import Video from 'react-native-video';
import type { OnVideoErrorData, VideoRef } from 'react-native-video';
import type { StyleProp, ViewStyle } from 'react-native';
import type { MediaVideoProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

function buildVideoError(data: OnVideoErrorData): Error {
  const detail = data.error;
  const message = detail.errorString ?? detail.localizedDescription ?? detail.error ?? 'Video playback error';
  const err = new Error(message);
  Object.assign(err, { nativeError: detail });
  return err;
}

function buildVideoStyle(
  style: ViewStyle | undefined,
  source: MediaVideoProps['source'],
): StyleProp<ViewStyle> {
  const aspectStyle = getAspectRatioStyle(source);
  if (!aspectStyle && !style) return { width: '100%', height: '100%' };
  return [aspectStyle && { width: '100%', aspectRatio: aspectStyle.aspectRatio }, style];
}

export function MediaVideo(props: MediaVideoProps) {
  const { source, autoPlay = false, muted = false, isLooping = false, resizeMode = 'contain', style } = props;
  const { onLoad, onEnd, onError } = props;
  const videoRef = useRef<VideoRef>(null);

  const handleLoad = useCallback(() => onLoad?.(), [onLoad]);
  const handleEnd = useCallback(() => onEnd?.(), [onEnd]);
  const handleError = useCallback(
    (data: OnVideoErrorData) => onError?.(buildVideoError(data)),
    [onError],
  );

  return (
    <Video
      ref={videoRef}
      source={{ uri: source.uri }}
      style={buildVideoStyle(style, source)}
      paused={!autoPlay}
      muted={muted}
      repeat={isLooping}
      resizeMode={resizeMode}
      controls
      {...(source.thumbnailUri ? { poster: source.thumbnailUri } : {})}
      onLoad={handleLoad}
      onEnd={handleEnd}
      onError={handleError}
    />
  );
}
