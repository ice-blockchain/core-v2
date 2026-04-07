import { describe, it, expect } from 'vitest';
import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('formats zero duration', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(24000)).toBe('0:24');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(96000)).toBe('1:36');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration(5000)).toBe('0:05');
  });

  it('formats long duration', () => {
    expect(formatDuration(600000)).toBe('10:00');
  });
});
