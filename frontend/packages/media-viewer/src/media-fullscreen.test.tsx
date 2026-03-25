import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MediaFullscreen } from './media-fullscreen';
import type { MediaViewerSource } from './types';

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const gestureBuilder = () => ({
    onUpdate: () => gestureBuilder(),
    onEnd: () => gestureBuilder(),
    enabled: () => gestureBuilder(),
    numberOfTaps: () => gestureBuilder(),
    activeOffsetY: () => gestureBuilder(),
  });
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Gesture: {
      Pinch: gestureBuilder,
      Tap: gestureBuilder,
      Pan: gestureBuilder,
      Exclusive: jest.fn(),
      Simultaneous: jest.fn(),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (value: number) => value,
    withSpring: (value: number) => value,
    runOnJS: (fn: () => void) => fn,
    interpolate: () => 1,
    Extrapolation: { CLAMP: 'clamp' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@ion/ui', () => {
  const { Text } = require('react-native');
  return { Text };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View testID="expo-image" {...props} />,
  };
});

jest.mock('expo-av', () => {
  const { forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    Video: forwardRef((props: Record<string, unknown>, ref: unknown) => (
      <View testID="expo-video" {...props} ref={ref} />
    )),
    ResizeMode: { CONTAIN: 'contain' },
  };
});

const imageSources: MediaViewerSource[] = [
  { uri: 'https://example.com/1.jpg', mimeType: 'image/jpeg' },
  { uri: 'https://example.com/2.jpg', mimeType: 'image/png' },
  { uri: 'https://example.com/3.mp4', mimeType: 'video/mp4' },
];

describe('MediaFullscreen', () => {
  it('renders a modal', () => {
    const { UNSAFE_getByType } = render(
      <MediaFullscreen sources={imageSources} onClose={jest.fn()} />,
    );
    const { Modal } = require('react-native');
    expect(UNSAFE_getByType(Modal)).toBeTruthy();
  });

  it('displays page indicator starting at first item', () => {
    const { getByText } = render(
      <MediaFullscreen sources={imageSources} onClose={jest.fn()} />,
    );
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <MediaFullscreen sources={imageSources} onClose={onClose} />,
    );
    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders image items for image mime types', () => {
    const { getAllByTestId } = render(
      <MediaFullscreen sources={imageSources} onClose={jest.fn()} />,
    );
    expect(getAllByTestId('expo-image').length).toBeGreaterThanOrEqual(1);
  });

  it('renders video items for video mime types', () => {
    const { getAllByTestId } = render(
      <MediaFullscreen sources={imageSources} onClose={jest.fn()} />,
    );
    expect(getAllByTestId('expo-video').length).toBeGreaterThanOrEqual(1);
  });
});
