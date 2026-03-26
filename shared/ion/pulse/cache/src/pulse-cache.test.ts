import { describe, it, expect } from 'vitest';
import { createPulseCache } from './pulse-cache';

function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe('createPulseCache', () => {
  it('round-trips set and get', () => {
    const cache = createPulseCache();
    const data = toBytes('hello');

    cache.set('soul-1', data);
    expect(cache.get('soul-1')).toEqual(data);
    cache.destroy();
  });

  it('returns undefined for missing key', () => {
    const cache = createPulseCache();

    expect(cache.get('nonexistent')).toBeUndefined();
    cache.destroy();
  });

  it('removes entry on invalidate', () => {
    const cache = createPulseCache();
    cache.set('soul-1', toBytes('data'));

    expect(cache.invalidate('soul-1')).toBe(true);
    expect(cache.get('soul-1')).toBeUndefined();
    expect(cache.invalidate('soul-1')).toBe(false);
    cache.destroy();
  });

  it('removes entries matching prefix on invalidatePrefix', () => {
    const cache = createPulseCache();
    cache.set('users/alice', toBytes('a'));
    cache.set('users/bob', toBytes('b'));
    cache.set('posts/1', toBytes('p'));

    const removed = cache.invalidatePrefix('users/');
    expect(removed).toBe(2);
    expect(cache.has('users/alice')).toBe(false);
    expect(cache.has('users/bob')).toBe(false);
    expect(cache.has('posts/1')).toBe(true);
    cache.destroy();
  });

  it('tracks hits and misses in stats', () => {
    const cache = createPulseCache();
    cache.set('key', toBytes('value'));

    cache.get('key');
    cache.get('key');
    cache.get('missing');

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    cache.destroy();
  });

  it('evicts entries when maxSize is exceeded', () => {
    const cache = createPulseCache({ maxSizeBytes: 100 });

    cache.set('a', new Uint8Array(40));
    cache.set('b', new Uint8Array(40));
    expect(cache.getStats().size).toBe(2);

    cache.set('c', new Uint8Array(40));
    expect(cache.getStats().evictions).toBeGreaterThan(0);
    cache.destroy();
  });

  it('clears all entries and resets stats', () => {
    const cache = createPulseCache();
    cache.set('a', toBytes('1'));
    cache.set('b', toBytes('2'));
    cache.get('a');
    cache.get('missing');

    cache.clear();

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
    cache.destroy();
  });

  it('returns correct boolean from has', () => {
    const cache = createPulseCache();

    expect(cache.has('x')).toBe(false);
    cache.set('x', toBytes('data'));
    expect(cache.has('x')).toBe(true);
    cache.destroy();
  });
});
