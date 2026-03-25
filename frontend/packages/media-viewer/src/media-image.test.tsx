import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { MediaImage } from './media-image';
import type { MediaViewerSource } from './types';

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => <View testID="expo-image" {...props} />,
}));

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/photo.jpg',
  mimeType: 'image/jpeg',
};

describe('MediaImage - rendering', () => {
  it('renders with the provided URI', () => {
    const image = render(<MediaImage source={baseSource} />).getByTestId('expo-image');
    expect(image.props.source).toEqual({ uri: baseSource.uri });
  });

  it('displays blurhash as placeholder', () => {
    const source = { ...baseSource, blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' };
    const image = render(<MediaImage source={source} />).getByTestId('expo-image');
    expect(image.props.placeholder).toEqual({ blurhash: source.blurhash });
  });

  it('applies aspect ratio when dimensions provided', () => {
    const source = { ...baseSource, width: 1920, height: 1080 };
    const image = render(<MediaImage source={source} />).getByTestId('expo-image');
    const flatStyle = [].concat(image.props.style).filter(Boolean);
    const hasAspectRatio = flatStyle.some(
      (s: Record<string, unknown>) => typeof s.aspectRatio === 'number',
    );
    expect(hasAspectRatio).toBe(true);
  });

  it('fills container when no dimensions provided', () => {
    const image = render(<MediaImage source={baseSource} />).getByTestId('expo-image');
    const flatStyle = [].concat(image.props.style).filter(Boolean);
    const hasFill = flatStyle.some(
      (s: Record<string, unknown>) => s.width === '100%' && s.height === '100%',
    );
    expect(hasFill).toBe(true);
  });
});

describe('MediaImage - callbacks', () => {
  it('fires onLoad callback', () => {
    const onLoad = jest.fn();
    const image = render(<MediaImage source={baseSource} onLoad={onLoad} />).getByTestId('expo-image');
    image.props.onLoad();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('fires onError callback with Error object', () => {
    const onError = jest.fn();
    const image = render(<MediaImage source={baseSource} onError={onError} />).getByTestId('expo-image');
    image.props.onError();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
