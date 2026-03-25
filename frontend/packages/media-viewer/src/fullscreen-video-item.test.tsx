import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { FullscreenVideoItem } from './fullscreen-video-item';
import type { MediaViewerSource } from './types';

const gestureBuilder = () => ({
  onUpdate: () => gestureBuilder(),
  onEnd: () => gestureBuilder(),
  activeOffsetY: () => gestureBuilder(),
});

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  Gesture: { Pan: gestureBuilder },
}));

jest.mock('react-native-reanimated', () => ({
  default: { View },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withSpring: (value: number) => value,
  runOnJS: (fn: () => void) => fn,
  interpolate: () => 1,
  Extrapolation: { CLAMP: 'clamp' },
}));

jest.mock('expo-av', () => ({
  Video: forwardRef((props: Record<string, unknown>, _ref) => (
    <View testID="expo-video" {...props} />
  )),
  ResizeMode: { CONTAIN: 'contain' },
}));

const source: MediaViewerSource = {
  uri: 'https://example.com/video.mp4',
  mimeType: 'video/mp4',
};

describe('FullscreenVideoItem', () => {
  it('renders a video player', () => {
    const { getByTestId } = render(
      <FullscreenVideoItem source={source} onClose={jest.fn()} />,
    );
    expect(getByTestId('expo-video')).toBeTruthy();
  });

  it('auto-plays the video in fullscreen', () => {
    const { getByTestId } = render(
      <FullscreenVideoItem source={source} onClose={jest.fn()} />,
    );
    const video = getByTestId('expo-video');
    expect(video.props.shouldPlay).toBe(true);
  });
});
