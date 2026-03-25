import React from 'react';
import { render } from '@testing-library/react-native';
import { MediaVideo } from './media-video';
import type { MediaViewerSource } from './types';

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

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/video.mp4',
  mimeType: 'video/mp4',
};

describe('MediaVideo', () => {
  it('renders with the provided URI', () => {
    const { getByTestId } = render(<MediaVideo source={baseSource} />);
    const video = getByTestId('expo-video');
    expect(video.props.source).toEqual({ uri: baseSource.uri });
  });

  it('auto-plays when autoPlay is true', () => {
    const { getByTestId } = render(<MediaVideo source={baseSource} autoPlay />);
    const video = getByTestId('expo-video');
    expect(video.props.shouldPlay).toBe(true);
  });

  it('does not auto-play by default', () => {
    const { getByTestId } = render(<MediaVideo source={baseSource} />);
    const video = getByTestId('expo-video');
    expect(video.props.shouldPlay).toBe(false);
  });

  it('starts muted when muted prop is true', () => {
    const { getByTestId } = render(<MediaVideo source={baseSource} muted />);
    const video = getByTestId('expo-video');
    expect(video.props.isMuted).toBe(true);
  });

  it('shows poster thumbnail when thumbnailUri provided', () => {
    const source = { ...baseSource, thumbnailUri: 'https://example.com/thumb.jpg' };
    const { getByTestId } = render(<MediaVideo source={source} />);
    const video = getByTestId('expo-video');
    expect(video.props.posterSource).toEqual({ uri: source.thumbnailUri });
    expect(video.props.usePoster).toBe(true);
  });

  it('fires onError callback with Error object', () => {
    const onError = jest.fn();
    const { getByTestId } = render(<MediaVideo source={baseSource} onError={onError} />);
    const video = getByTestId('expo-video');
    video.props.onError('Network error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
