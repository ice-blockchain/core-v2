import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import { MediaImage } from './media-image';
import type { MediaViewerSource } from './types';

const baseSource: MediaViewerSource = {
  uri: 'https://example.com/photo.jpg',
  mimeType: 'image/jpeg',
};

function flattenStyle(image: { props: { style: unknown } }) {
  return ([] as Record<string, unknown>[]).concat(image.props.style as never).filter(Boolean);
}

describe('MediaImage - rendering', () => {
  it('renders with the provided URI', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} />);
    expect(UNSAFE_getByType(Image).props.source).toEqual({ uri: baseSource.uri });
  });

  it('maps fill resize mode to stretch', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} resizeMode="fill" />);
    expect(UNSAFE_getByType(Image).props.resizeMode).toBe('stretch');
  });

  it('applies aspect ratio when dimensions provided', () => {
    const source = { ...baseSource, width: 1920, height: 1080 };
    const { UNSAFE_getByType } = render(<MediaImage source={source} />);
    const styles = flattenStyle(UNSAFE_getByType(Image));
    expect(styles.some((s) => typeof s.aspectRatio === 'number')).toBe(true);
  });

  it('fills container when no dimensions provided', () => {
    const { UNSAFE_getByType } = render(<MediaImage source={baseSource} />);
    const styles = flattenStyle(UNSAFE_getByType(Image));
    expect(styles.some((s) => s.width === '100%' && s.height === '100%')).toBe(true);
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
