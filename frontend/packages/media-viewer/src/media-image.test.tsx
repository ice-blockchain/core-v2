import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { MediaImage } from './media-image';
import type { MediaViewerSource } from './types';

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/photo.jpg',
  mimeType: 'image/jpeg',
};

describe('MediaImage - rendering', () => {
  it('renders with the provided URI', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} />);
    const image = UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: baseSource.uri });
  });

  it('maps fill resize mode to stretch', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} resizeMode="fill" />);
    const image = UNSAFE_getByType(Image);
    expect(image.props.resizeMode).toBe('stretch');
  });

  it('applies aspect ratio when dimensions provided', () => {
    const source = { ...baseSource, width: 1920, height: 1080 };
    const { UNSAFE_getByType } = render(<MediaImage source={source} />);
    const image = UNSAFE_getByType(Image);
    const flatStyle = [].concat(image.props.style).filter(Boolean);
    const hasAspectRatio = flatStyle.some(
      (s: Record<string, unknown>) => typeof s.aspectRatio === 'number',
    );
    expect(hasAspectRatio).toBe(true);
  });

  it('fills container when no dimensions provided', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} />);
    const image = UNSAFE_getByType(Image);
    const flatStyle = [].concat(image.props.style).filter(Boolean);
    const hasFill = flatStyle.some(
      (s: Record<string, unknown>) => s.width === '100%' && s.height === '100%',
    );
    expect(hasFill).toBe(true);
  });
});

describe('MediaImage - callbacks', () => {
  it('fires onLoad callback', () => {
    const onLoad = vi.fn();
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} onLoad={onLoad} />);
    const image = UNSAFE_getByType(Image);
    image.props.onLoad();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('fires onError callback with Error object', () => {
    const onError = vi.fn();
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} onError={onError} />);
    const image = UNSAFE_getByType(Image);
    image.props.onError();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
