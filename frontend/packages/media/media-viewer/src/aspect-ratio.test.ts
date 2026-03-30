import { calculateAspectRatio, getAspectRatioStyle } from './aspect-ratio';

describe('calculateAspectRatio', () => {
  it('returns correct ratio for landscape dimensions', () => {
    const result = calculateAspectRatio({ width: 1920, height: 1080 });
    expect(result).toEqual({
      width: 1920,
      height: 1080,
      aspectRatio: 1920 / 1080,
    });
  });

  it('returns correct ratio for portrait dimensions', () => {
    const result = calculateAspectRatio({ width: 1080, height: 1920 });
    expect(result).toEqual({
      width: 1080,
      height: 1920,
      aspectRatio: 1080 / 1920,
    });
  });

  it('returns null when width is missing', () => {
    expect(calculateAspectRatio({ height: 100 })).toBeNull();
  });

  it('returns null when height is missing', () => {
    expect(calculateAspectRatio({ width: 100 })).toBeNull();
  });

  it('returns null when height is zero', () => {
    expect(calculateAspectRatio({ width: 100, height: 0 })).toBeNull();
  });
});

describe('getAspectRatioStyle', () => {
  it('returns aspect ratio style when dimensions provided', () => {
    const style = getAspectRatioStyle({ width: 800, height: 600 });
    expect(style).toEqual({ aspectRatio: 800 / 600 });
  });

  it('returns undefined when dimensions missing', () => {
    expect(getAspectRatioStyle({})).toBeUndefined();
  });
});
