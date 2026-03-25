import React from 'react';
import { View } from 'react-native';
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

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  Gesture: {
    Pinch: gestureBuilder,
    Tap: gestureBuilder,
    Pan: gestureBuilder,
    Exclusive: jest.fn(),
    Simultaneous: jest.fn(),
  },
}));

jest.mock('react-native-reanimated', () => ({
  default: { View },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (value: number) => value,
  withSpring: (value: number) => value,
  runOnJS: (fn: () => void) => fn,
  interpolate: () => 1,
  Extrapolation: { CLAMP: 'clamp' },
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => <View testID="fullscreen-image" {...props} />,
}));

const source: MediaViewerSource = {
  uri: 'https://example.com/photo.jpg',
  mimeType: 'image/jpeg',
};

describe('FullscreenImageItem', () => {
  it('renders the image with correct URI', () => {
    const { getByTestId } = render(
      <FullscreenImageItem source={source} onClose={jest.fn()} />,
    );
    const image = getByTestId('fullscreen-image');
    expect(image.props.source).toEqual({ uri: source.uri });
  });

  it('uses contain content fit for fullscreen display', () => {
    const { getByTestId } = render(
      <FullscreenImageItem source={source} onClose={jest.fn()} />,
    );
    const image = getByTestId('fullscreen-image');
    expect(image.props.contentFit).toBe('contain');
  });
});
