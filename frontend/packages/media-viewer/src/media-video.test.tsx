import { forwardRef } from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { MediaVideo } from './media-video';
import type { MediaViewerSource } from './types';

jest.mock('react-native-video', () => {
  return {
    __esModule: true,
    default: forwardRef((props: Record<string, unknown>, _ref) => (
      <View testID="rn-video" {...props} />
    )),
  };
});

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/video.mp4',
  mimeType: 'video/mp4',
};

function renderVideo(props: Partial<Parameters<typeof MediaVideo>[0]> = {}) {
  return render(<MediaVideo source={baseSource} {...props} />).getByTestId('rn-video');
}

describe('MediaVideo playback', () => {
  it('renders with the provided URI', () => {
    const video = renderVideo();
    expect(video.props.source).toEqual({ uri: baseSource.uri });
  });

  it('auto-plays when autoPlay is true', () => {
    expect(renderVideo({ autoPlay: true }).props.paused).toBe(false);
  });

  it('is paused by default', () => {
    expect(renderVideo().props.paused).toBe(true);
  });

  it('starts muted when muted prop is true', () => {
    expect(renderVideo({ muted: true }).props.muted).toBe(true);
  });
});

describe('MediaVideo callbacks', () => {
  it('shows poster thumbnail when thumbnailUri provided', () => {
    const source = { ...baseSource, thumbnailUri: 'https://example.com/thumb.jpg' };
    const video = render(<MediaVideo source={source} />).getByTestId('rn-video');
    expect(video.props.poster).toBe(source.thumbnailUri);
  });

  it('fires onEnd callback when video ends', () => {
    const onEnd = jest.fn();
    renderVideo({ onEnd }).props.onEnd();
    expect(onEnd).toHaveBeenCalled();
  });

  it('fires onError callback with native error details', () => {
    const onError = jest.fn();
    const nativeErrorData = { error: { errorString: 'Codec not supported', errorCode: '-1' } };
    renderVideo({ onError }).props.onError(nativeErrorData);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Codec not supported',
      nativeError: nativeErrorData.error,
    }));
  });
});
