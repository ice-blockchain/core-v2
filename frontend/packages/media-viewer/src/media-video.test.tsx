import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { MediaVideo } from './media-video';
import type { MediaViewerSource } from './types';

jest.mock('expo-av', () => ({
  Video: forwardRef((props: Record<string, unknown>, _ref) => (
    <View testID="expo-video" {...props} />
  )),
  ResizeMode: { CONTAIN: 'contain' },
}));

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/video.mp4',
  mimeType: 'video/mp4',
};

describe('MediaVideo', () => {
  it('renders with the provided URI', () => {
    const video = render(<MediaVideo source={baseSource} />).getByTestId('expo-video');
    expect(video.props.source).toEqual({ uri: baseSource.uri });
  });

  it('auto-plays when autoPlay is true', () => {
    const video = render(<MediaVideo source={baseSource} autoPlay />).getByTestId('expo-video');
    expect(video.props.shouldPlay).toBe(true);
  });

  it('does not auto-play by default', () => {
    const video = render(<MediaVideo source={baseSource} />).getByTestId('expo-video');
    expect(video.props.shouldPlay).toBe(false);
  });

  it('starts muted when muted prop is true', () => {
    const video = render(<MediaVideo source={baseSource} muted />).getByTestId('expo-video');
    expect(video.props.isMuted).toBe(true);
  });

  it('shows poster thumbnail when thumbnailUri provided', () => {
    const source = { ...baseSource, thumbnailUri: 'https://example.com/thumb.jpg' };
    const video = render(<MediaVideo source={source} />).getByTestId('expo-video');
    expect(video.props.posterSource).toEqual({ uri: source.thumbnailUri });
    expect(video.props.usePoster).toBe(true);
  });

  it('fires onError callback with Error object', () => {
    const onError = jest.fn();
    const video = render(<MediaVideo source={baseSource} onError={onError} />).getByTestId('expo-video');
    video.props.onError('Network error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
