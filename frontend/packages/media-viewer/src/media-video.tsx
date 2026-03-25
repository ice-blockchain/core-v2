import React, { useCallback, useRef } from 'react';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import type { StyleProp, ViewStyle } from 'react-native';
import type { MediaVideoProps } from './types';
import { getAspectRatioStyle } from './aspect-ratio';

function buildVideoStyle(
  style: ViewStyle | undefined,
  source: MediaVideoProps['source'],
): StyleProp<ViewStyle> {
  const aspectStyle = getAspectRatioStyle(source);
  if (!aspectStyle && !style) return { width: '100%', height: '100%' };
  return [aspectStyle && { width: '100%', aspectRatio: aspectStyle.aspectRatio }, style];
}

export function MediaVideo(props: MediaVideoProps) {
  const {
    source,
    autoPlay = false,
    muted = false,
    isLooping = false,
    style,
    onLoad,
    onError,
  } = props;

  const videoRef = useRef<Video>(null);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.isLoaded && onLoad && status.durationMillis !== undefined) {
        onLoad();
      }
    },
    [onLoad],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      onError?.(new Error(errorMessage));
    },
    [onError],
  );

  return (
    <Video
      ref={videoRef}
      source={{ uri: source.uri }}
      style={buildVideoStyle(style, source)}
      shouldPlay={autoPlay}
      isMuted={muted}
      isLooping={isLooping}
      resizeMode={ResizeMode.CONTAIN}
      useNativeControls
      posterSource={source.thumbnailUri ? { uri: source.thumbnailUri } : undefined}
      usePoster={Boolean(source.thumbnailUri)}
      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      onError={handleError}
    />
  );
}
