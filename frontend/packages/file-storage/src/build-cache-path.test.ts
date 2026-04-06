import { describe, it, expect } from 'vitest';
import { buildCachePath } from './build-cache-path';

describe('buildCachePath', () => {
  it('constructs path from directory and fileId', () => {
    expect(buildCachePath('/cache', 'abc123')).toBe('/cache/abc123');
  });

  it('handles trailing slash in directory', () => {
    expect(buildCachePath('/cache/', 'file-1')).toBe('/cache//file-1');
  });
});
