import React from 'react';
import { Image, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { FullscreenImageItem } from './fullscreen-image-item';
import type { MediaViewerSource } from './types';

const gestureBuilder = () => ({
  onUpdate: () => gestureBuilder(),
  onEnd: () => gestureBuilder(),
  enabled: () => gestureBuilder(),
  numberOfTaps: () => gestureBuilder(),
  activeOffsetY: () => gestureBuilder(),
});

vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  Gesture: {
    Pinch: gestureBuilder,
    Tap: gestureBuilder,
    Pan: gestureBuilder,
    Exclusive: vi.fn(),
    Simultaneous: vi.fn(),
  },
}));

vi.mock('react-native-reanimated', () => ({
  default: { View },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (value: number) => value,
  withSpring: (value: number) => value,
  runOnJS: (fn: () => void) => fn,
  interpolate: () => 1,
  Extrapolation: { CLAMP: 'clamp' },
}));

const source: MediaViewerSource = {
  uri: 'https://example.com/photo.jpg',
  mimeType: 'image/jpeg',
};

describe('FullscreenImageItem', () => {
  it('renders the image with correct URI', () => {
    const { UNSAFE_getByType } = render(
      <FullscreenImageItem source={source} onClose={vi.fn()} />,
    );
    const image = UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: source.uri });
  });

  it('uses contain resize mode for fullscreen display', () => {
    const { UNSAFE_getByType } = render(
      <FullscreenImageItem source={source} onClose={vi.fn()} />,
    );
    const image = UNSAFE_getByType(Image);
    expect(image.props.resizeMode).toBe('contain');
  });
});
